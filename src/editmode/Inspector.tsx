import type { SiteContent } from "@/content/site"
import { SECTIONS } from "@/admin/sections"
import { btn, btnGhost, field } from "@/admin/ui"
import { getPath, mediaRef, type Row } from "./draft"

/** Seções que dá para esconder. A primeira tela (capa) fica sempre. */
export const HIDEABLE = [
  { id: "about", label: "Sobre mim" },
  { id: "world", label: "My little world" },
  { id: "creator", label: "Creator side" },
  { id: "collab", label: "Let's collab" },
  { id: "mediaKit", label: "Media kit" },
  { id: "contact", label: "Contato" },
]

export type Ops = {
  busy: boolean
  text: (path: string, value: string) => void
  /** `item` é o caminho do item (ex.: world.photos.2); `to` a nova posição. */
  move: (item: string, to: number) => void
  toggle: (id: string) => void
  file: (path: string, file: File) => void
  add: (section: string, file: File) => void
  patch: (path: string, patch: Partial<Row>) => void
  remove: (path: string) => void
  close: () => void
}

const NAMES: Record<string, string> = {
  a: "Título (parte 1)", b: "Título (parte 2)", phrase: "Frase", note: "Texto de apoio", heading: "Título", title: "Título",
  text: "Texto", label: "Rótulo", value: "Valor", href: "Link", url: "Link", handle: "Perfil", network: "Rede social",
  greeting: "Cumprimento", nameWord: "Nome grande", tab: "Aba", name: "Nome", year: "Ano", fine: "Letra miúda", word: "Palavra grande",
  heart: "Adesivo (coração)", green: "Adesivo verde", openLabel: "Texto sobre o vídeo", factsTitle: "Título da lista", soonTitle: "Título",
  soonNote: "Texto",
}
const nameOf = (path: string) => NAMES[path.split(".").pop()!] ?? "Texto"

/** Texto que o site mostra como lista de linhas: o campo vira uma caixa de texto simples. */
function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <textarea className={`${field} mt-1 font-normal`} rows={value.length > 60 ? 5 : 2} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function Move({ item, ops, count }: { item: string; ops: Ops; count: number }) {
  const m = /^(.*)\.(\d+)$/.exec(item)
  if (!m) return null
  const i = Number(m[2])
  return (
    <div className="flex gap-2">
      <button className={`${btnGhost} flex-1`} disabled={i === 0} onClick={() => ops.move(item, i - 1)}>
        ◀ Antes
      </button>
      <button className={`${btnGhost} flex-1`} disabled={i >= count - 1} onClick={() => ops.move(item, i + 1)}>
        Depois ▶
      </button>
    </div>
  )
}

function FilePick({ label, accept, disabled, onFile }: { label: string; accept: string; disabled: boolean; onFile: (f: File) => void }) {
  return (
    <label className={`${btn} w-full cursor-pointer ${disabled ? "pointer-events-none opacity-40" : ""}`}>
      {label}
      <input
        type="file"
        className="sr-only"
        accept={accept}
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ""
        }}
      />
    </label>
  )
}

function MediaPanel({ path, content, ops }: { path: string; content: SiteContent; ops: Ops }) {
  const ref = mediaRef(path)!
  const sec = SECTIONS.find((s) => s.id === ref.section)!
  const accept = sec.kinds.includes("video") ? "video/mp4" : "image/*"
  const list = ref.section === "world" ? content.world.photos : ref.section === "creator" ? content.creator.videos : null
  const item = list ? list[ref.index] : null
  const photo = ref.section === "world" ? content.world.photos[ref.index] : null
  const video = ref.section === "creator" ? content.creator.videos[ref.index] : null
  const thumb = photo?.src ?? video?.poster ?? (ref.section === "cover" ? content.hero.cover.src : ref.section === "about" ? content.about.photo.src : "")
  const alt = photo?.alt ?? video?.alt ?? (ref.section === "cover" ? content.hero.cover.alt : content.about.photo.alt)

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black">{ref.section === "creator" ? "Vídeo" : "Foto"}</h2>
      {thumb ? <img src={thumb} alt="" className="mx-auto max-h-48 rounded-2xl bg-pink-100 object-contain" /> : <p className="rounded-2xl bg-pink-100 p-4 text-center text-sm">Espaço vazio</p>}
      <FilePick label={ref.section === "creator" ? "Trocar o vídeo (mp4)" : "Trocar a foto"} accept={accept} disabled={ops.busy} onFile={(f) => ops.file(path, f)} />
      <p className="text-xs text-neutral-600">Dica: dá para soltar um arquivo direto em cima do {ref.section === "creator" ? "vídeo" : "item"} no site.</p>
      {photo && <TextField label="Etiqueta (fita sobre a foto)" value={photo.tag} onChange={(v) => ops.patch(path, { title: v })} />}
      {video && (
        <label className="block text-sm font-semibold">
          Link do Reel no Instagram
          <input className={`${field} mt-1 font-normal`} inputMode="url" placeholder="https://www.instagram.com/reel/..." value={video.reelUrl} onChange={(e) => ops.patch(path, { reel_url: e.target.value })} />
        </label>
      )}
      <TextField label="Descrição (para leitores de tela)" value={alt} onChange={(v) => ops.patch(path, { alt: v })} />
      {list && item && (
        <>
          <Move item={ref.base} ops={ops} count={list.length} />
          <button className={`${btnGhost} w-full text-pink-700`} onClick={() => confirm("Tirar este item do site? Vale quando você salvar.") && ops.remove(path)}>
            Tirar do site
          </button>
        </>
      )}
    </div>
  )
}

/** Campos de texto de um objeto inteiro (cartão de serviço, rede social, link de contato). */
function ObjectFields({ path, value, ops }: { path: string; value: Record<string, unknown>; ops: Ops }) {
  const keys = Object.keys(value).filter((k) => typeof value[k] === "string")
  return (
    <>
      {keys.map((k) => (
        <TextField key={k} label={nameOf(k)} value={value[k] as string} onChange={(v) => ops.text(`${path}.${k}`, v)} />
      ))}
    </>
  )
}

function Sections({ content, ops }: { content: SiteContent; ops: Ops }) {
  const hidden = content.hidden ?? []
  return (
    <details className="rounded-2xl bg-pink-50 p-3" open>
      <summary className="cursor-pointer text-sm font-semibold">Seções do site</summary>
      <ul className="mt-2 space-y-1">
        {HIDEABLE.map((s) => (
          <li key={s.id}>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" className="size-5" checked={!hidden.includes(s.id)} onChange={() => ops.toggle(s.id)} />
              {s.label}
              {hidden.includes(s.id) && <span className="text-xs text-neutral-500">(escondida)</span>}
            </label>
          </li>
        ))}
      </ul>
    </details>
  )
}

export default function Inspector({ sel, content, ops }: { sel: string | null; content: SiteContent; ops: Ops }) {
  const value = sel && !sel.startsWith("section:") ? getPath(content, sel) : undefined
  const parent = sel ? /^(.*)\.(\d+)$/.exec(sel) : null
  const siblings = parent ? getPath(content, parent[1]) : null

  let body: React.ReactNode
  if (!sel) {
    body = (
      <div className="space-y-2 text-sm">
        <h2 className="text-lg font-black">Toque no que quiser mudar</h2>
        <p>Clique em qualquer texto, foto ou vídeo do site. Para mudar a ordem, arraste fotos, vídeos e serviços; para trocar uma foto, solte um arquivo em cima dela.</p>
      </div>
    )
  } else if (sel.startsWith("section:")) {
    body = <p className="text-sm">Esta é a seção “{HIDEABLE.find((s) => s.id === sel.slice(8))?.label ?? "capa"}”. Use a lista abaixo para mostrar ou esconder.</p>
  } else if (mediaRef(sel)) {
    body = <MediaPanel path={sel} content={content} ops={ops} />
  } else {
    body = (
      <div className="space-y-4">
        <h2 className="text-lg font-black">{typeof value === "string" ? nameOf(sel) : "Item"}</h2>
        {typeof value === "string" ? (
          <TextField label="Texto" value={value} onChange={(v) => ops.text(sel, v)} />
        ) : value && typeof value === "object" ? (
          <ObjectFields path={sel} value={value as Record<string, unknown>} ops={ops} />
        ) : null}
        {typeof value === "string" && sel.endsWith(".href") && <p className="text-xs text-neutral-600">Use https://… para sites e mailto:… para e-mail.</p>}
        {typeof value === "string" && sel.startsWith("about.bio") && <p className="text-xs text-neutral-600">Use **duas estrelas** para deixar em negrito.</p>}
        {parent && Array.isArray(siblings) && <Move item={sel} ops={ops} count={siblings.length} />}
      </div>
    )
  }

  const mediaSection = sel ? mediaRef(sel)?.section : undefined
  return (
    <div className="space-y-4">
      {sel && (
        <button className="text-sm underline" onClick={ops.close}>
          ✕ Fechar
        </button>
      )}
      {body}
      <div className="space-y-2">
        {(["world", "creator"] as const).map((s) =>
          !sel || mediaSection === s ? (
            <FilePick
              key={s}
              label={s === "world" ? "+ Adicionar foto" : "+ Adicionar vídeo (mp4)"}
              accept={s === "world" ? "image/*" : "video/mp4"}
              disabled={ops.busy}
              onFile={(f) => ops.add(s, f)}
            />
          ) : null,
        )}
      </div>
      <Sections content={content} ops={ops} />
    </div>
  )
}
