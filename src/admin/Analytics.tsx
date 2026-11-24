import { useEffect, useState } from "react"
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
}

const DEVICE: Record<string, string> = { mobile: "Celular", tablet: "Tablet", desktop: "Computador" }
const nf = new Intl.NumberFormat("pt-BR")

const targetLabel = (type: string, target: string) => {
  if (target.startsWith("reel:")) return `Reel ${target.slice(5)}`
  const names: Record<string, string> = { email: "E-mail", instagram: "Instagram", tiktok: "TikTok" }
  return names[target] ?? (type === "video_play" ? `Vídeo ${target}` : target)
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={card}>
      <p className="text-3xl font-black tracking-tight">{nf.format(value)}</p>
      <p className="text-sm text-neutral-600">{label}</p>
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
            <Stat label="Pessoas que entraram" value={data.visitors} />
            <Stat label="Hoje" value={data.visitors_today} />
            <Stat label="Visualizações" value={data.views} />
            <Stat label="Cliques (redes, e-mail, Reels)" value={data.clicks} />
          </div>

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
              <Bars rows={data.sources.map((s) => ({ label: s.source === "direto" ? "Direto (link ou digitado)" : s.source, value: s.visitors }))} />
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
          <p className="text-xs text-neutral-500">Suas próprias visitas, feitas neste aparelho depois de entrar no painel, não entram na conta.</p>
        </>
      )}
    </div>
  )
}
