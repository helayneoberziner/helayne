import { useEffect, useState } from "react"
import { site, type SiteContent } from "@/content/site"
import { SETTINGS_KEY, deepMerge, type AutoMetrics } from "@/lib/siteContent"
import { supabase } from "@/lib/supabase"
import { btn, card, field } from "./ui"

type Kit = SiteContent["mediaKit"]
type Saved = Record<string, unknown>

/** Números do media kit (seguidores, curtidas, público, alcance): grava em site_settings, mesma chave dos Textos. */
export default function Numbers() {
  const [kit, setKit] = useState<Kit | null>(null)
  const [saved, setSaved] = useState<Saved>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")
  const [auto, setAuto] = useState<AutoMetrics | null>(null)
  const [reading, setReading] = useState(false)
  const [autoMsg, setAutoMsg] = useState("")

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "metrics")
      .maybeSingle()
      .then(({ data }) => setAuto((data?.value as AutoMetrics | null) ?? null))
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle()
      .then(({ data }) => {
        setSaved((data?.value as Saved | null) ?? {})
        setKit(deepMerge(site, data?.value).mediaKit)
      })
  }, [])

  if (!kit) return <p className="text-sm">Carregando...</p>

  const setMetric = (si: number, mi: number, value: string) => {
    setMsg("")
    setKit({ ...kit, socials: kit.socials.map((s, i) => (i !== si ? s : { ...s, metrics: s.metrics.map((m, j) => (j !== mi ? m : { ...m, value })) })) })
  }
  const setAudience = (ai: number, value: string) => {
    setMsg("")
    setKit({ ...kit, audience: { ...kit.audience, items: kit.audience.items.map((m, i) => (i !== ai ? m : { ...m, value })) } })
  }

  const save = async () => {
    setBusy(true)
    const { error } = await supabase.from("site_settings").upsert({ key: SETTINGS_KEY, value: { ...saved, mediaKit: kit }, updated_at: new Date().toISOString() })
    if (!error) setSaved({ ...saved, mediaKit: kit })
    setBusy(false)
    setMsg(error ? "Não consegui salvar. Tente de novo." : "Salvo! O media kit do site já mostra os números novos.")
  }

  const useAuto = auto?.auto ?? true
  const toggleAuto = async (on: boolean) => {
    const value: AutoMetrics = { ...(auto ?? { readAt: new Date().toISOString(), instagram: { followers: null, posts: null }, tiktok: { followers: null, likes: null, videos: null } }), auto: on }
    const { error } = await supabase.from("site_settings").upsert({ key: "metrics", value, updated_at: new Date().toISOString() })
    if (!error) setAuto(value)
    setAutoMsg(error ? "Não consegui salvar a escolha." : on ? "Leitura automática ligada." : "Leitura automática desligada: vale só o que você digitar abaixo.")
  }
  const readNow = async () => {
    setReading(true)
    setAutoMsg("")
    try {
      const { data } = await supabase.auth.getSession()
      const r = await fetch("/api/metrics", { method: "POST", headers: { authorization: `Bearer ${data.session?.access_token ?? ""}` } })
      if (!r.ok) throw new Error(String(r.status))
      const v = (await r.json()) as AutoMetrics
      setAuto(v)
      const blocked = Object.entries(v.status ?? {}).filter(([, s]) => s !== "ok").map(([n]) => (n === "instagram" ? "Instagram" : "TikTok"))
      setAutoMsg(blocked.length ? `Não consegui ler ${blocked.join(" e ")} agora (o perfil recusou a leitura). Mantive o número anterior; digite abaixo se quiser.` : "Pronto! Números lidos dos perfis.")
    } catch {
      setAutoMsg("Não consegui ler agora. Isso só funciona no site publicado; tente de novo em alguns minutos.")
    }
    setReading(false)
  }
  const when = auto?.readAt ? new Date(auto.readAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : null

  return (
    <div className="space-y-4">
      <section className={card}>
        <h2 className="mb-1 font-bold">Leitura automática dos perfis</h2>
        <p className="mb-3 text-sm text-neutral-600">
          Toda segunda-feira o site lê os números públicos do Instagram e do TikTok. O Instagram às vezes recusa; nesse caso fica o último número e você pode digitar abaixo.
          {when ? ` Última leitura: ${when}.` : " Ainda não houve leitura."}
        </p>
        <label className="mb-3 flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={useAuto} onChange={(e) => toggleAuto(e.target.checked)} />
          Usar a leitura automática no site
        </label>
        <button className={btn} onClick={readNow} disabled={reading}>
          {reading ? "Lendo..." : "Ler agora"}
        </button>
        {autoMsg && (
          <p className="mt-3 text-sm text-pink-700" role="status">
            {autoMsg}
          </p>
        )}
      </section>

      <p className="text-sm text-neutral-600">Atualize aqui os números que as marcas veem no media kit. Escreva como quer que apareça (ex.: 2.045 ou 12,4 mil).</p>

      {kit.socials.map((s, si) => (
        <section key={s.network} className={card}>
          <h2 className="mb-3 font-bold">
            {s.network} <span className="font-normal text-neutral-600">{s.handle}</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {s.metrics.map((m, mi) => (
              <label key={m.label} className="block text-sm">
                <span className="capitalize">{m.label}</span>
                <input className={field} value={m.value} onChange={(e) => setMetric(si, mi, e.target.value)} />
              </label>
            ))}
          </div>
        </section>
      ))}

      <section className={card}>
        <h2 className="mb-1 font-bold">Público e alcance</h2>
        <p className="mb-3 text-sm text-neutral-600">Pegue no Instagram: Perfil → Painel profissional → Insights. Só aparece no site o que estiver preenchido; se deixar tudo vazio, o site mostra “Em breve”.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {kit.audience.items.map((m, ai) => (
            <label key={m.label} className="block text-sm">
              {m.label}
              <input className={field} value={m.value} onChange={(e) => setAudience(ai, e.target.value)} />
            </label>
          ))}
        </div>
      </section>

      <section className={card}>
        <label className="block text-sm">
          <span className="font-bold">Frase da data</span>
          <span className="block text-neutral-600">Aparece embaixo do título “Media kit”. Atualize quando mudar os números.</span>
          <input
            className={field}
            value={kit.note}
            onChange={(e) => {
              setMsg("")
              setKit({ ...kit, note: e.target.value })
            }}
          />
        </label>
      </section>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-full bg-white/95 p-2 shadow-lg ring-1 ring-pink-100 backdrop-blur">
        <button className={btn} onClick={save} disabled={busy}>
          {busy ? "Salvando..." : "Salvar números"}
        </button>
        {msg && (
          <span className="text-sm text-pink-700" role="status">
            {msg}
          </span>
        )}
      </div>
    </div>
  )
}
