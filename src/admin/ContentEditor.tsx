import { useEffect, useState } from "react"
import { site } from "@/content/site"
import { MEDIA_MANAGED, SETTINGS_KEY, deepMerge } from "@/lib/siteContent"
import { supabase } from "@/lib/supabase"
import { btn, btnGhost, card, field } from "./ui"

/*
 * Editor genérico dos textos: lê o formato de `SiteContent` (src/content/site.ts) e desenha um formulário
 * para cada campo, então novos campos do layout aparecem aqui sozinhos. Fotos e vídeos ficam na aba própria.
 */

type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

const LABELS: Record<string, string> = {
  name: "Nome",
  city: "Cidade",
  email: "E-mail de contato",
  year: "Ano",
  hero: "Início (capa)",
  about: "Sobre mim",
  world: "My little world",
  creator: "Creator side",
  collab: "Let's collab",
  mediaKit: "Media kit (métricas)",
  contact: "Contato",
  bio: "Texto (um parágrafo por caixa; **assim** deixa em negrito)",
  socials: "Redes",
  metrics: "Números",
  services: "Serviços",
  links: "Links",
  soon: "Em breve",
  facts: "Em poucas palavras",
  label: "Nome",
  value: "Valor",
  title: "Título",
  text: "Texto",
  url: "Link",
  handle: "Usuário",
  network: "Rede",
  href: "Link",
  note: "Nota",
  phrase: "Frase em inglês",
  fine: "Rodapé",
}

const label = (key: string) => LABELS[key] ?? key

const isObject = (v: Json): v is { [key: string]: Json } => typeof v === "object" && v !== null && !Array.isArray(v)

const omit = (value: Json, paths: string[], prefix = ""): Json => {
  if (!isObject(value)) return value
  const out: { [key: string]: Json } = {}
  for (const [k, v] of Object.entries(value)) {
    const p = prefix ? `${prefix}.${k}` : k
    if (!paths.includes(p)) out[k] = omit(v, paths, p)
  }
  return out
}

const blankLike = (v: Json): Json =>
  typeof v === "string" ? "" : Array.isArray(v) ? [] : isObject(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blankLike(x)])) : v

function Node({ name, value, path, onChange }: { name: string; value: Json; path: string; onChange: (v: Json) => void }) {
  if (MEDIA_MANAGED.includes(path)) return null

  if (typeof value === "string") {
    const long = value.length > 70 || value.includes("\n")
    return (
      <label className="block text-sm">
        <span className="font-semibold">{label(name)}</span>
        {long ? (
          <textarea className={`${field} mt-1 min-h-28`} value={value} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <input className={`${field} mt-1`} value={value} onChange={(e) => onChange(e.target.value)} />
        )}
      </label>
    )
  }

  if (Array.isArray(value)) {
    const list = value
    const set = (i: number, v: Json) => onChange(list.map((x, j) => (j === i ? v : x)))
    const remove = (i: number) => onChange(list.filter((_, j) => j !== i))
    const add = () => onChange([...list, list.length ? blankLike(list[0]) : ""])
    return (
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">{label(name)}</legend>
        {list.map((item, i) => (
          <div key={i} className="space-y-3 rounded-2xl bg-pink-50 p-3">
            <Node name={typeof item === "string" ? `${label(name)} ${i + 1}` : String(i + 1)} value={item} path={`${path}.${i}`} onChange={(v) => set(i, v)} />
            <button type="button" className="min-h-11 text-sm text-pink-700 underline" onClick={() => remove(i)}>
              Remover
            </button>
          </div>
        ))}
        <button type="button" className={btnGhost} onClick={add}>
          + Adicionar
        </button>
      </fieldset>
    )
  }

  if (isObject(value)) {
    return (
      <div className="space-y-4">
        {Object.entries(value).map(([k, v]) => (
          <Node key={k} name={k} value={v} path={`${path}.${k}`} onChange={(nv) => onChange({ ...value, [k]: nv })} />
        ))}
      </div>
    )
  }

  return null
}

export default function ContentEditor() {
  const [content, setContent] = useState<{ [key: string]: Json } | null>(null)
  const [saved, setSaved] = useState(false)
  const [msg, setMsg] = useState("")
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { data } = await supabase.from("site_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle()
    setContent(deepMerge(site as unknown as { [key: string]: Json }, data?.value))
  }

  useEffect(() => {
    load()
  }, [])

  if (!content) return <p className="text-sm">Carregando...</p>

  const save = async () => {
    setBusy(true)
    setMsg("")
    const value = omit(content, MEDIA_MANAGED)
    const { error } = await supabase.from("site_settings").upsert({ key: SETTINGS_KEY, value, updated_at: new Date().toISOString() })
    setBusy(false)
    setSaved(!error)
    setMsg(error ? "Não consegui salvar. Tente de novo." : "Salvo! O site já mostra o texto novo.")
  }

  const reset = async () => {
    if (!confirm("Voltar todos os textos para o padrão do site? Não dá para desfazer.")) return
    setBusy(true)
    await supabase.from("site_settings").delete().eq("key", SETTINGS_KEY)
    await load()
    setBusy(false)
    setMsg("Textos restaurados para o padrão.")
  }

  const groups = Object.entries(content)
  const general = groups.filter(([, v]) => typeof v === "string")
  const sections = groups.filter(([, v]) => typeof v !== "string")
  const set = (k: string, v: Json) => {
    setSaved(false)
    setContent({ ...content, [k]: v })
  }

  return (
    <div className="space-y-4">
      <details open className={card}>
        <summary className="min-h-11 cursor-pointer text-lg font-bold">Geral</summary>
        <div className="mt-3 space-y-4">
          {general.map(([k, v]) => (
            <Node key={k} name={k} value={v} path={k} onChange={(nv) => set(k, nv)} />
          ))}
        </div>
      </details>
      {sections.map(([k, v]) => (
        <details key={k} className={card}>
          <summary className="min-h-11 cursor-pointer text-lg font-bold">{label(k)}</summary>
          <div className="mt-3">
            <Node name={k} value={v} path={k} onChange={(nv) => set(k, nv)} />
          </div>
        </details>
      ))}
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-full bg-white/95 p-2 shadow-lg ring-1 ring-pink-100 backdrop-blur">
        <button className={btn} onClick={save} disabled={busy}>
          {busy ? "Salvando..." : saved ? "Salvo ✓" : "Salvar textos"}
        </button>
        <button className={btnGhost} onClick={reset} disabled={busy}>
          Restaurar padrão
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
