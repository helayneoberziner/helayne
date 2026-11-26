import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { btnGhost, card } from "./ui"

export type Lead = { id: string; created_at: string; name: string; email: string; brand: string | null; message: string; phone: string | null; source: string | null; lido: boolean }

/** Quantos contatos ainda não foram lidos (bolinha da aba). Retorna 0 se a migração 0003 ainda não rodou. */
export const countUnread = async () => {
  const { count } = await supabase.from("leads").select("id", { count: "exact", head: true }).eq("lido", false)
  return count ?? 0
}

const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })

/** Contatos enviados pelo formulário do site (tabela `leads`, supabase/migrations/0003_leads.sql). */
export default function Leads({ onChange }: { onChange: () => void }) {
  const [rows, setRows] = useState<Lead[] | null>(null)
  const [err, setErr] = useState("")

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(200)
    if (error) return setErr("Não consegui ler os contatos. Falta rodar a migração 0003_leads.sql no Supabase?")
    setErr("")
    setRows(data as Lead[])
  }, [])
  useEffect(() => void load(), [load])

  const toggle = async (l: Lead) => {
    const { error } = await supabase.from("leads").update({ lido: !l.lido }).eq("id", l.id)
    if (error) return setErr("Não consegui marcar agora.")
    setRows((r) => r?.map((x) => (x.id === l.id ? { ...x, lido: !l.lido } : x)) ?? null)
    onChange()
  }

  if (err) return <p className={`${card} text-sm text-pink-700`}>{err}</p>
  if (!rows) return <p className="text-sm text-neutral-600">Carregando...</p>
  if (rows.length === 0) return <p className={`${card} text-sm text-neutral-600`}>Nenhum contato ainda. Os envios do formulário do site aparecem aqui.</p>

  return (
    <ul className="space-y-3">
      {rows.map((l) => (
        <li key={l.id} className={`${card} ${l.lido ? "opacity-70" : "ring-2 ring-pink-400"}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <h2 className="font-bold">
              {!l.lido && <span className="mr-2 rounded-full bg-pink-600 px-2 py-0.5 text-xs text-white">novo</span>}
              {l.brand || l.name}
            </h2>
            <span className="text-xs text-neutral-500">
              {when(l.created_at)}
              {l.source && l.source !== "site" ? ` · via ${l.source}` : ""}
            </span>
          </div>
          <p className="text-sm text-neutral-600">
            {l.name} · {l.email}
            {l.phone ? ` · ${l.phone}` : ""}
          </p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm">{l.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              className={btnGhost}
              href={`mailto:${l.email}?subject=${encodeURIComponent("Re: parceria com a Helayne")}`}
              onClick={() => !l.lido && toggle(l)}
            >
              Responder por e-mail
            </a>
            <button className={btnGhost} onClick={() => toggle(l)}>
              {l.lido ? "Marcar como não lido" : "Marcar como lido"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
