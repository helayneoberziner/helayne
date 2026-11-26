import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { btn, btnGhost, card, field } from "./ui"

const KNOWN = ["direto", "instagram", "tiktok", "google", "whatsapp", "facebook"]
const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)

/** Links com etiqueta: `?utm_source=marca` já é lido pelo contador (src/lib/track.ts) e aparece em Visitas → De onde vieram. */
export default function Links() {
  const [brand, setBrand] = useState("")
  const [copied, setCopied] = useState("")
  const [stats, setStats] = useState<{ source: string; visitors: number }[]>([])

  useEffect(() => {
    supabase.rpc("analytics_summary", { days: 90 }).then(({ data }) => {
      const rows = ((data as { sources?: { source: string; visitors: number }[] } | null)?.sources ?? []).filter((s) => !KNOWN.includes(s.source) && !s.source.includes("."))
      setStats(rows)
    })
  }, [])

  const base = location.origin + "/"
  const tag = slug(brand)
  const link = tag ? `${base}?utm_source=${tag}` : ""

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(text)
    } catch {
      setCopied("")
      window.prompt("Copie o link:", text)
    }
  }

  return (
    <div className="space-y-4">
      <section className={card}>
        <h2 className="mb-1 font-bold">Link do site</h2>
        <p className="mb-3 text-sm text-neutral-600">O link principal, com a prévia bonita no WhatsApp e no Instagram.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className={field} readOnly value={base} onFocus={(e) => e.target.select()} />
          <button className={btnGhost} onClick={() => copy(base)}>
            {copied === base ? "Copiado ✓" : "Copiar"}
          </button>
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-1 font-bold">Link para uma marca</h2>
        <p className="mb-3 text-sm text-neutral-600">Digite o nome da marca e mande o link gerado só para ela. Depois, em Visitas, você vê quantas pessoas entraram por esse link.</p>
        <input className={field} placeholder="Nome da marca (ex.: Vivara)" value={brand} onChange={(e) => setBrand(e.target.value)} />
        {link && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input className={field} readOnly value={link} onFocus={(e) => e.target.select()} />
            <button className={btn} onClick={() => copy(link)}>
              {copied === link ? "Copiado ✓" : "Copiar"}
            </button>
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="mb-3 font-bold">Resultado dos links com marca (90 dias)</h2>
        {stats.length === 0 ? (
          <p className="text-sm text-neutral-600">Nenhum link com marca recebeu visita ainda.</p>
        ) : (
          <ul className="divide-y divide-pink-100 text-sm">
            {stats.map((s) => (
              <li key={s.source} className="flex justify-between py-2">
                <span>{s.source}</span>
                <strong>{s.visitors} pessoas</strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
