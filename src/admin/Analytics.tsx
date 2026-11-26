import { useEffect, useState } from "react"
import { site } from "@/content/site"
import { supabase } from "@/lib/supabase"
import { btnGhost, card } from "./ui"

type Summary = {
  views: number
  visitors: number
  visitors_today: number
  clicks: number
  by_day: { day: string; views: number; visitors: number }[]
  sources: { source: string; visitors: number }[]
  devices: { device: string; visitors: number }[]
  top_targets: { type: string; target: string; total: number }[]
  // Campos da migração 0002; sem ela o painel só não mostra estes blocos.
  visitors_yesterday?: number
  prev?: { views: number; visitors: number; clicks: number }
  contact?: { email: number; instagram: number; tiktok: number }
  reels?: { target: string; plays: number; visitors: number }[]
  recent?: { created_at: string; source: string; device: string }[]
}

const SOURCE: Record<string, string> = { direto: "Direto (link ou digitado)", instagram: "Instagram", tiktok: "TikTok", google: "Google", whatsapp: "WhatsApp", facebook: "Facebook" }
/** Fontes conhecidas ganham nome; um domínio fica como está; o resto veio de um link com etiqueta (aba Links). */
export const sourceLabel = (s: string) => SOURCE[s] ?? (s.includes(".") ? s : `Link “${s}”`)

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (m < 1) return "agora"
  if (m < 60) return `há ${m} min`
  if (m < 1440) return `há ${Math.round(m / 60)} h`
  return `há ${Math.round(m / 1440)} d`
}

/** "+30% vs. período anterior"; sem base de comparação, não mostra nada. */
const delta = (now: number, before?: number) => {
  if (before === undefined) return ""
  if (before === 0) return now > 0 ? "novo" : ""
  const p = Math.round(((now - before) / before) * 100)
  return `${p > 0 ? "+" : ""}${p}% vs. período anterior`
}

/** Nome do Reel: usa a descrição do vídeo do site quando o id bate; senão mostra o id. */
const reelName = (target: string) => {
  const id = target.replace(/^reel:/, "")
  return site.creator.videos.find((v) => v.reelUrl.includes(`/${id}/`))?.alt ?? `Reel ${id}`
}

const DEVICE: Record<string, string> = { mobile: "Celular", tablet: "Tablet", desktop: "Computador" }
const nf = new Intl.NumberFormat("pt-BR")

const targetLabel = (type: string, target: string) => {
  if (target.startsWith("reel:")) return `Reel ${target.slice(5)}`
  const names: Record<string, string> = { email: "E-mail", instagram: "Instagram", tiktok: "TikTok" }
  return names[target] ?? (type === "video_play" ? `Vídeo ${target}` : target)
}

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className={card}>
      <p className="text-3xl font-black tracking-tight">{nf.format(value)}</p>
      <p className="text-sm text-neutral-600">{label}</p>
      {note && <p className={`mt-1 text-xs ${note.startsWith("-") ? "text-neutral-500" : "text-emerald-700"}`}>{note}</p>}
    </div>
  )
}

function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  if (!rows.length) return <p className="text-sm text-neutral-600">Ainda sem dados.</p>
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="flex justify-between">
            <span>{r.label}</span>
            <strong>{nf.format(r.value)}</strong>
          </div>
          <div className="mt-1 h-2 rounded-full bg-pink-100">
            <div className="h-2 rounded-full bg-pink-500" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function Analytics() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    setData(null)
    setError("")
    supabase.rpc("analytics_summary", { days }).then(({ data, error }) => {
      if (error) setError("Não consegui carregar as visitas agora.")
      else setData(data as Summary)
    })
  }, [days])

  const chart = data?.by_day ?? []
  const maxDay = Math.max(1, ...chart.map((d) => d.views))

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setDays(d)} className={d === days ? "inline-flex min-h-11 items-center rounded-full bg-neutral-900 px-5 text-sm font-semibold text-white" : btnGhost}>
            {d} dias
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-pink-700">{error}</p>}
      {!data && !error && <p className="text-sm">Carregando...</p>}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Pessoas que entraram" value={data.visitors} note={delta(data.visitors, data.prev?.visitors)} />
            <Stat label="Hoje" value={data.visitors_today} note={data.visitors_yesterday === undefined ? "" : `ontem: ${nf.format(data.visitors_yesterday)}`} />
            <Stat label="Visualizações" value={data.views} note={delta(data.views, data.prev?.views)} />
            <Stat label="Cliques (redes, e-mail, Reels)" value={data.clicks} note={delta(data.clicks, data.prev?.clicks)} />
          </div>

          {data.contact && (
            <section className={card}>
              <h2 className="mb-1 font-bold">Marcas chegando até você</h2>
              <p className="mb-3 text-sm text-neutral-600">Cliques nos contatos do site neste período.</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {([["E-mail", data.contact.email], ["Instagram", data.contact.instagram], ["TikTok", data.contact.tiktok]] as const).map(([name, n]) => (
                  <div key={name} className="rounded-2xl bg-pink-50 p-3">
                    <p className="text-2xl font-black">{nf.format(n)}</p>
                    <p className="text-xs text-neutral-600">{name}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className={card}>
            <h2 className="mb-3 font-bold">Visualizações por dia</h2>
            {chart.length === 0 ? (
              <p className="text-sm text-neutral-600">Ainda sem dados.</p>
            ) : (
              <div className="flex h-36 items-end gap-1" role="img" aria-label="Gráfico de visualizações por dia">
                {chart.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center justify-end" title={`${d.day}: ${d.views} visualizações, ${d.visitors} pessoas`}>
                    <div className="w-full rounded-t bg-pink-500" style={{ height: `${Math.max(4, (d.views / maxDay) * 100)}%` }} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-3 md:grid-cols-3">
            <section className={card}>
              <h2 className="mb-3 font-bold">De onde vieram</h2>
              <Bars rows={data.sources.map((s) => ({ label: sourceLabel(s.source), value: s.visitors }))} />
            </section>
            <section className={card}>
              <h2 className="mb-3 font-bold">Aparelho</h2>
              <Bars rows={data.devices.map((d) => ({ label: DEVICE[d.device] ?? d.device, value: d.visitors }))} />
            </section>
            <section className={card}>
              <h2 className="mb-3 font-bold">Mais clicados</h2>
              <Bars rows={data.top_targets.map((t) => ({ label: targetLabel(t.type, t.target), value: t.total }))} />
            </section>
          </div>
          {data.reels && data.reels.length > 0 && (
            <section className={card}>
              <h2 className="mb-3 font-bold">Reels mais abertos</h2>
              <Bars rows={data.reels.map((r) => ({ label: reelName(r.target), value: r.plays }))} />
            </section>
          )}

          {data.recent && data.recent.length > 0 && (
            <section className={card}>
              <h2 className="mb-3 font-bold">Últimas visitas</h2>
              <ul className="divide-y divide-pink-100 text-sm">
                {data.recent.map((r, i) => (
                  <li key={i} className="flex justify-between gap-3 py-2">
                    <span>{sourceLabel(r.source)}</span>
                    <span className="text-neutral-600">
                      {DEVICE[r.device] ?? r.device} · {ago(r.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className="text-xs text-neutral-500">Suas próprias visitas, feitas neste aparelho depois de entrar no painel, não entram na conta.</p>
        </>
      )}
    </div>
  )
}
