import { useEffect, useState } from "react"
import { site, type SiteContent } from "@/content/site"
import { SETTINGS_KEY, deepMerge } from "@/lib/siteContent"
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

  useEffect(() => {
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

  return (
    <div className="space-y-4">
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
