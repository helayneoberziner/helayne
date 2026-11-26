import { site, type SiteContent } from "@/content/site"
import { SECTIONS } from "@/admin/sections"
import { MAX_VIDEO, posterFrom, toWebp, upload } from "@/admin/mediaTools"
import { SETTINGS_KEY, applyMedia, deepMerge } from "@/lib/siteContent"
import { mediaUrl, supabase, type MediaKind, type MediaRow } from "@/lib/supabase"

/*
 * Rascunho do modo edição: tudo o que a Helayne muda fica aqui, na memória, até ela apertar "Salvar".
 * - override: o mesmo JSON que o painel /feca grava em site_settings (chave "content").
 * - media: linhas da tabela `media`. Linhas novas ou trocadas carregam o arquivo (`file`) e uma prévia local;
 *   linhas "default:" são as mídias que ainda moram no código e viram arquivo no bucket só ao salvar.
 */

export type Obj = Record<string, unknown>
export type Row = MediaRow & { src?: string; posterSrc?: string; file?: Blob; posterFile?: Blob }
export type Draft = { override: Obj; media: Row[]; trash: string[] }

export const emptyDraft = (): Draft => ({ override: {}, media: [], trash: [] })

// ── caminhos ────────────────────────────────────────────────────────────────

export const getPath = (o: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((a, k) => (a == null ? undefined : (a as Obj)[k]), o)

/** Grava `value` em `path` sem mexer no resto. Listas ainda ausentes do override nascem copiadas do conteúdo atual (`base`). */
export function setPath(over: Obj, base: unknown, path: string, value: unknown): Obj {
  const keys = path.split(".")
  const rec = (node: unknown, i: number): unknown => {
    const baseNode = getPath(base, keys.slice(0, i).join("."))
    const cur = (node ?? (Array.isArray(baseNode) ? baseNode : {})) as Obj
    const copy: Obj = Array.isArray(cur) ? ([...cur] as unknown as Obj) : { ...cur }
    copy[keys[i]] = i === keys.length - 1 ? value : rec(cur[keys[i]], i + 1)
    return copy
  }
  return rec(over, 0) as Obj
}

const MEDIA_RE = /^(hero\.cover|about\.photo|world\.photos\.(\d+)|creator\.videos\.(\d+))(\.|$)/
/** Itens que se arrastam no site (mídia ou serviço). */
export const ITEM_RE = /^(hero\.cover|about\.photo|(?:world\.photos|creator\.videos|collab\.services)\.\d+)/

export const mediaRef = (path: string) => {
  const m = MEDIA_RE.exec(path)
  if (!m) return null
  const section = m[1] === "hero.cover" ? "cover" : m[1] === "about.photo" ? "about" : m[1].startsWith("world") ? "world" : "creator"
  return { section, index: Number(m[2] ?? m[3] ?? 0), base: m[1] }
}

export const baseItem = (path: string) => ITEM_RE.exec(path)?.[1] ?? null

// ── texto ───────────────────────────────────────────────────────────────────

const baseOf = (d: Draft) => deepMerge(site as unknown as Obj, d.override)

export const setText = (d: Draft, path: string, value: unknown): Draft => ({ ...d, override: setPath(d.override, baseOf(d), path, value) })

export const moveInArray = (d: Draft, arrPath: string, from: number, to: number): Draft => {
  const arr = getPath(baseOf(d), arrPath)
  if (!Array.isArray(arr) || from === to || to < 0 || to >= arr.length) return d
  const next = [...arr]
  next.splice(to, 0, ...next.splice(from, 1))
  return setText(d, arrPath, next)
}

export const toggleHidden = (d: Draft, id: string): Draft => {
  const hidden = ((baseOf(d) as SiteContent).hidden ?? []) as string[]
  return setText(d, "hidden", hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id])
}

// ── mídia ───────────────────────────────────────────────────────────────────

type Def = { kind: MediaKind; src: string; poster?: string; alt: string; title?: string; reel?: string }
const abs = (u: string) => new URL(u, location.origin).href
const isReal = (p?: string | null): p is string => !!p && !p.startsWith("default:") && !p.startsWith("local:")

/** O que o código mostra enquanto o banco não tem nada naquela seção. */
const defaultRows = (section: string): Row[] => {
  const defs: Def[] =
    section === "cover"
      ? [{ kind: "photo", src: site.hero.cover.src, alt: site.hero.cover.alt }]
      : section === "about"
        ? [{ kind: "photo", src: site.about.photo.src, alt: site.about.photo.alt }]
        : section === "world"
          ? site.world.photos.filter((p) => p.src).map((p) => ({ kind: "photo" as const, src: p.src!, alt: p.alt, title: p.tag }))
          : site.creator.videos.map((v) => ({ kind: "video" as const, src: v.src, poster: v.poster, alt: v.alt, reel: v.reelUrl }))
  return defs.map((x, i) => ({
    id: crypto.randomUUID(),
    kind: x.kind,
    section,
    path: "default:" + x.src,
    poster_path: x.poster ? "default:" + x.poster : null,
    reel_url: x.reel ?? null,
    title: x.title ?? null,
    alt: x.alt,
    position: i,
    published: true,
    created_at: "",
    src: abs(x.src),
    posterSrc: x.poster ? abs(x.poster) : undefined,
  }))
}

export const live = (d: Draft, section: string) =>
  d.media.filter((r) => r.section === section && r.published).sort((a, b) => a.position - b.position)

const seed = (d: Draft, section: string): Draft => (live(d, section).length ? d : { ...d, media: [...d.media, ...defaultRows(section)] })

const put = (d: Draft, section: string, rows: Row[]): Draft => ({
  ...d,
  media: [...d.media.filter((r) => !(r.section === section && r.published)), ...rows.map((r, i) => ({ ...r, position: i }))],
})

export type Prepared = { kind: MediaKind; blob: Blob; poster?: Blob }

/** Confere o arquivo e deixa no formato do site (foto vira webp leve; vídeo ganha poster). */
export async function prepare(section: string, file: File): Promise<Prepared> {
  const sec = SECTIONS.find((s) => s.id === section)!
  const isVideo = file.type === "video/mp4"
  const isImage = file.type.startsWith("image/")
  if (!isVideo && !isImage) throw new Error("Use foto (jpg, png, webp) ou vídeo mp4.")
  if (isVideo && !sec.kinds.includes("video")) throw new Error("Aqui só cabe foto.")
  if (isImage && !sec.kinds.includes("photo")) throw new Error("Aqui só cabe vídeo mp4.")
  if (isVideo && file.size > MAX_VIDEO) throw new Error("O vídeo tem mais de 50 MB. Comprima e tente de novo.")
  return isVideo ? { kind: "video", blob: file, poster: await posterFrom(file) } : { kind: "photo", blob: await toWebp(file) }
}

/** Troca o arquivo do item `index`; se o item ainda não existe, cria um novo no fim da seção. */
export function replaceMedia(d: Draft, section: string, index: number, p: Prepared): Draft {
  d = seed(d, section)
  const rows = live(d, section)
  const old = rows[index]
  const row: Row = {
    id: old?.id ?? crypto.randomUUID(),
    kind: p.kind,
    section,
    reel_url: old?.reel_url ?? null,
    title: old?.title ?? null,
    alt: old?.alt ?? null,
    position: old?.position ?? rows.length,
    published: true,
    created_at: old?.created_at ?? "",
    path: "local:" + crypto.randomUUID(),
    poster_path: p.poster ? "local:" + crypto.randomUUID() : null,
    file: p.blob,
    posterFile: p.poster,
    src: URL.createObjectURL(p.blob),
    posterSrc: p.poster ? URL.createObjectURL(p.poster) : undefined,
  }
  const next = [...rows]
  next[old ? index : rows.length] = row
  const trash = old ? [old.path, old.poster_path].filter(isReal) : []
  return { ...put(d, section, next), trash: [...new Set([...d.trash, ...trash])] }
}

export function moveMedia(d: Draft, section: string, from: number, to: number): Draft {
  d = seed(d, section)
  const rows = [...live(d, section)]
  if (from === to || !rows[from] || to < 0 || to >= rows.length) return d
  rows.splice(to, 0, ...rows.splice(from, 1))
  return put(d, section, rows)
}

export function patchMedia(d: Draft, section: string, index: number, patch: Partial<Row>): Draft {
  d = seed(d, section)
  return put(d, section, live(d, section).map((r, i) => (i === index ? { ...r, ...patch } : r)))
}

export function removeMedia(d: Draft, section: string, index: number): Draft {
  d = seed(d, section)
  return put(d, section, live(d, section).filter((_, i) => i !== index))
}

// ── conteúdo para mostrar ───────────────────────────────────────────────────

/** O que o site mostraria se o rascunho fosse salvo agora (com as prévias locais das fotos novas). */
export const contentOf = (d: Draft): SiteContent => {
  const urls = new Map<string, string>()
  for (const r of d.media) {
    if (r.src) urls.set(r.path, r.src)
    if (r.poster_path && r.posterSrc) urls.set(r.poster_path, r.posterSrc)
  }
  return applyMedia(
    deepMerge(site, d.override),
    d.media.filter((r) => r.published),
    (p) => urls.get(p) ?? mediaUrl(p),
  )
}

// ── banco ───────────────────────────────────────────────────────────────────

export async function loadDraft(): Promise<Draft> {
  const [s, m] = await Promise.all([
    supabase.from("site_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle(),
    supabase.from("media").select("*"),
  ])
  if (s.error || m.error) throw new Error("Não consegui ler o site agora.")
  return { override: (s.data?.value ?? {}) as Obj, media: (m.data ?? []) as Row[], trash: [] }
}

async function fetchBlob(url: string, want: string): Promise<Blob> {
  const res = await fetch(url)
  const blob = await res.blob()
  if (!res.ok || !blob.type.startsWith(want)) throw new Error("Arquivo não encontrado: " + url)
  return blob
}

/** Grava o rascunho no Supabase: textos em site_settings, arquivos no bucket `media` e linhas na tabela `media`. */
export async function saveDraft(saved: Draft, cur: Draft): Promise<void> {
  if (cur.override !== saved.override) {
    const { error } = await supabase.from("site_settings").upsert({ key: SETTINGS_KEY, value: cur.override, updated_at: new Date().toISOString() })
    if (error) throw error
  }

  const existing = new Map(saved.media.map((r) => [r.id, r]))
  for (const { id: section } of SECTIONS) {
    for (const [i, r] of live(cur, section).entries()) {
      let { path, poster_path } = r
      if (r.file || path.startsWith("default:")) {
        const isVideo = r.kind === "video"
        const blob = r.file ?? (await fetchBlob(r.src!, isVideo ? "video/" : "image/"))
        const uid = crypto.randomUUID()
        path = `${section}/${uid}.${isVideo ? "mp4" : "webp"}`
        await upload(path, blob, isVideo ? "video/mp4" : blob.type || "image/webp")
        poster_path = null
        if (isVideo) {
          const pb = r.posterFile ?? (r.posterSrc ? await fetchBlob(r.posterSrc, "image/").catch(() => null) : null)
          if (pb) {
            poster_path = `${section}/${uid}-poster.webp`
            await upload(poster_path, pb, pb.type || "image/webp")
          }
        }
      }
      const fields = { kind: r.kind, section, path, poster_path, reel_url: r.reel_url, title: r.title, alt: r.alt, position: i, published: r.published }
      const old = existing.get(r.id)
      const same = old && (Object.keys(fields) as (keyof typeof fields)[]).every((k) => old[k] === fields[k])
      if (same) continue
      const { error } = old ? await supabase.from("media").update(fields).eq("id", r.id) : await supabase.from("media").insert(fields)
      if (error) throw error
    }
  }

  const keep = new Set(cur.media.map((r) => r.id))
  const gone = saved.media.filter((r) => !keep.has(r.id))
  if (gone.length) {
    const { error } = await supabase.from("media").delete().in("id", gone.map((r) => r.id))
    if (error) throw error
  }
  const files = [...gone.flatMap((r) => [r.path, r.poster_path]), ...cur.trash].filter(isReal)
  if (files.length) await supabase.storage.from("media").remove(files)
}
