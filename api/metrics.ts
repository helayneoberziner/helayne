/*
 * Leitura semanal dos números públicos dos perfis (Vercel Cron, segunda 08h de Brasília) e botão "Ler agora" da aba Números.
 * Lê só as páginas públicas, uma vez por semana, para não tomar bloqueio. Instagram costuma recusar leitura automática:
 * quando falha, o número anterior fica e o painel avisa. Resultado em site_settings, chave "metrics".
 *
 * Variáveis na Vercel: CRON_SECRET (o cron envia sozinho) e SUPABASE_SERVICE_ROLE_KEY (para o cron gravar sem login).
 * O botão do painel usa o login da Helayne e não precisa da chave de serviço.
 */
const SB = process.env.VITE_SUPABASE_URL ?? "https://ejledeusgkdwfnxydbku.supabase.co"
const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_oMk7EO8dhmI6p8PjN4772A_EgkWp7Uy"
const INSTAGRAM = "helayne_oberziner"
const TIKTOK = "helayne_oberziner"
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

type Num = number | null
type Metrics = {
  auto: boolean
  readAt: string
  instagram: { followers: Num; posts: Num }
  tiktok: { followers: Num; likes: Num; videos: Num }
  status: { instagram: string; tiktok: string }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

/** "2,045" / "2.045" / "12.4K" / "1.2M" → número */
const parseCount = (s: string): Num => {
  const m = s.trim().match(/^([\d.,]+)\s*([KkMm])?$/)
  if (!m) return null
  const base = m[2] ? Number(m[1].replace(",", ".")) : Number(m[1].replace(/[.,]/g, ""))
  if (!Number.isFinite(base)) return null
  return Math.round(base * (m[2] ? (m[2].toLowerCase() === "k" ? 1e3 : 1e6) : 1))
}

const page = async (url: string, headers: Record<string, string> = {}) => {
  const r = await fetch(url, { headers: { "user-agent": UA, "accept-language": "en-US,en;q=0.9", ...headers }, redirect: "follow", signal: AbortSignal.timeout(8000) })
  if (!r.ok) throw new Error(String(r.status))
  return r.text()
}

const readTikTok = async (): Promise<{ data: Metrics["tiktok"]; ok: boolean }> => {
  const empty = { followers: null, likes: null, videos: null }
  try {
    const html = await page(`https://www.tiktok.com/@${TIKTOK}`)
    const pick = (k: string): Num => {
      const m = html.match(new RegExp(`"${k}":(\\d+)`))
      return m ? Number(m[1]) : null
    }
    const data = { followers: pick("followerCount"), likes: pick("heartCount"), videos: pick("videoCount") }
    return { data, ok: data.followers !== null }
  } catch {
    return { data: empty, ok: false }
  }
}

const readInstagram = async (): Promise<{ data: Metrics["instagram"]; ok: boolean }> => {
  const empty = { followers: null, posts: null }
  try {
    const html = await page(`https://www.instagram.com/${INSTAGRAM}/`)
    const m = html.match(/content="([\d.,KkMm]+) Followers?, [\d.,KkMm]+ Following, ([\d.,KkMm]+) Posts?/)
    if (m) return { data: { followers: parseCount(m[1]), posts: parseCount(m[2]) }, ok: true }
  } catch {
    /* tenta a rota de perfil abaixo */
  }
  try {
    const raw = await page(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${INSTAGRAM}`, { "x-ig-app-id": "936619743392459" })
    const u = JSON.parse(raw)?.data?.user
    const data = { followers: (u?.edge_followed_by?.count as Num) ?? null, posts: (u?.edge_owner_to_timeline_media?.count as Num) ?? null }
    return { data, ok: data.followers !== null }
  } catch {
    return { data: empty, ok: false }
  }
}

/** Cron (CRON_SECRET) ou admin logado (token do Supabase, conferido por is_admin). */
const authorize = async (req: Request): Promise<{ ok: boolean; token: string }> => {
  const auth = req.headers.get("authorization") ?? ""
  const token = auth.replace(/^Bearer /, "")
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) return { ok: true, token: "" }
  if (!token) return { ok: false, token }
  const r = await fetch(`${SB}/rest/v1/rpc/is_admin`, { method: "POST", headers: { apikey: ANON, authorization: `Bearer ${token}`, "content-type": "application/json" }, body: "{}" })
  return { ok: r.ok && (await r.json()) === true, token }
}

const run = async (req: Request): Promise<Response> => {
  const { ok, token } = await authorize(req)
  if (!ok) return json({ error: "não autorizado" }, 401)
  // Botão do painel: grava com o login do admin (regra de segurança do banco). Cron: chave de serviço.
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!token && !service) return json({ error: "falta SUPABASE_SERVICE_ROLE_KEY na Vercel" }, 500)
  const headers: Record<string, string> = token
    ? { apikey: ANON, authorization: `Bearer ${token}`, "content-type": "application/json" }
    : { apikey: service, "content-type": "application/json", ...(service.startsWith("eyJ") ? { authorization: `Bearer ${service}` } : {}) }

  const prevRes = await fetch(`${SB}/rest/v1/site_settings?key=eq.metrics&select=value`, { headers })
  if (!prevRes.ok) return json({ error: "não consegui ler o banco", detail: await prevRes.text() }, 500)
  const prev = ((await prevRes.json()) as { value: Metrics }[])[0]?.value

  const [ig, tt] = await Promise.all([readInstagram(), readTikTok()])
  // Número que não deu para ler mantém o valor anterior em vez de apagar.
  const keep = <T extends Record<string, Num>>(now: T, old?: T): T => Object.fromEntries(Object.entries(now).map(([k, v]) => [k, v ?? old?.[k] ?? null])) as T
  const value: Metrics = {
    auto: prev?.auto ?? true,
    readAt: new Date().toISOString(),
    instagram: keep(ig.data, prev?.instagram),
    tiktok: keep(tt.data, prev?.tiktok),
    status: { instagram: ig.ok ? "ok" : "bloqueado", tiktok: tt.ok ? "ok" : "bloqueado" },
  }
  const save = await fetch(`${SB}/rest/v1/site_settings?on_conflict=key`, {
    method: "POST",
    headers: { ...headers, prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ key: "metrics", value, updated_at: value.readAt }),
  })
  if (!save.ok) return json({ error: "não consegui gravar", detail: await save.text() }, 500)
  return json(value)
}

export const GET = run
export const POST = run
