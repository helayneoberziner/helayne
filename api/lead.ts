/*
 * Formulário de contato do site (POST /api/lead): grava o lead na tabela `leads` (aba Contatos do /feca) e avisa a Racun por e-mail (Resend).
 * Se o e-mail falhar ou não estiver configurado, o lead continua salvo e o visitante vê sucesso.
 *
 * Variáveis na Vercel:
 *   SUPABASE_SERVICE_ROLE_KEY  obrigatória (grava em `leads`; nunca vai ao navegador)
 *   RESEND_API_KEY             chave do Resend; sem ela só salva e avisa no log
 *   CONTACT_NOTIFY_EMAIL       opcional, destinatário (padrão: racunagencia@gmail.com, o mesmo do site da Racun)
 *   SENDER_EMAIL               opcional, remetente (padrão: contato@agenciaracun.com; o domínio precisa estar verificado no Resend)
 */
const SB = process.env.VITE_SUPABASE_URL ?? "https://ejledeusgkdwfnxydbku.supabase.co"

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, max) : "")
const oneLine = (s: string) => s.replace(/\s+/g, " ")
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

// shortcut: limite por IP em memória da instância; reinicia a cada cold start. Subir para tabela no banco se aparecer spam.
const hits = new Map<string, number[]>()
const limited = (ip: string) => {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 500) for (const [k, v] of hits) if (now - v[v.length - 1] > 3600_000) hits.delete(k)
  return recent.length > 5
}

const notify = async (lead: { name: string; email: string; brand: string; message: string; source: string }) => {
  const key = process.env.RESEND_API_KEY
  if (!key) return console.warn("RESEND_API_KEY ausente: lead salvo, e-mail não enviado")
  const sender = process.env.SENDER_EMAIL ?? "contato@agenciaracun.com"
  const rows: [string, string][] = [
    ["Nome", lead.name],
    ["E-mail", lead.email],
    ["Marca", lead.brand],
    ["Origem", lead.source],
    ["Mensagem", lead.message],
  ]
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#111111;color:#f2efe9;padding:24px">
      <h2 style="color:#f2a6c0;margin:0 0 16px">Novo contato pelo site da Helayne</h2>
      <table style="border-collapse:collapse;width:100%;max-width:600px">
        ${rows
          .filter(([, v]) => v)
          .map(([k, v]) => `<tr><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.12);width:110px;color:#9a968f;vertical-align:top">${k}</td><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.12)">${esc(v).replace(/\n/g, "<br/>")}</td></tr>`)
          .join("")}
      </table>
      <p style="color:#9a968f;font-size:13px;margin:16px 0 0">Responda este e-mail para falar com a marca. O contato também está na aba Contatos do painel /feca.</p>
    </div>`
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: `Helayne Oberziner <${sender}>`,
        to: [process.env.CONTACT_NOTIFY_EMAIL ?? "racunagencia@gmail.com"],
        reply_to: lead.email,
        subject: oneLine(`Novo contato: ${lead.brand || lead.name}`).slice(0, 120),
        html,
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) console.error(`Resend falhou [${r.status}]: ${await r.text()}`)
  } catch (e) {
    console.error("Resend erro", e)
  }
}

export const POST = async (req: Request): Promise<Response> => {
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!service) {
    console.error("falta SUPABASE_SERVICE_ROLE_KEY na Vercel")
    return json({ error: "indisponível" }, 500)
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== "object") return json({ error: "dados inválidos" }, 400)

  // Honeypot: campo escondido que só robô preenche. Responde sucesso sem gravar.
  if (text(body.website, 200)) return json({ ok: true })

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "?"
  if (limited(ip)) return json({ error: "muitas tentativas" }, 429)

  const lead = {
    name: oneLine(text(body.name, 100)),
    email: oneLine(text(body.email, 255)),
    brand: oneLine(text(body.brand, 120)),
    message: text(body.message, 2000),
    source: oneLine(text(body.source, 40)) || "site",
  }
  if (!lead.name || !lead.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) return json({ error: "dados inválidos" }, 400)

  // Chave nova do Supabase (sb_secret_...) vai só em apikey; a antiga (JWT) também em authorization.
  const save = await fetch(`${SB}/rest/v1/leads`, {
    method: "POST",
    headers: { apikey: service, "content-type": "application/json", prefer: "return=minimal", ...(service.startsWith("eyJ") ? { authorization: `Bearer ${service}` } : {}) },
    body: JSON.stringify({ ...lead, brand: lead.brand || null }),
  })
  if (!save.ok) {
    console.error(`não gravou o lead [${save.status}]: ${await save.text()}`)
    return json({ error: "não consegui salvar" }, 500)
  }

  await notify(lead)
  return json({ ok: true })
}
