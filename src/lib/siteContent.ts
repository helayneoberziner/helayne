import { useEffect, useState } from "react"
import type { SiteContent } from "@/content/site"
import { mediaUrl, supabase, type MediaRow } from "./supabase"

/*
 * O que o site mostra = padrão do código (src/content/site.ts) + textos salvos no painel /feca
 * (tabela site_settings, chave "content") + mídia enviada pelo painel (tabela media).
 * Sem nada no banco, ou sem internet, o site continua igual ao padrão.
 */

export const SETTINGS_KEY = "content"

type Json = unknown

const isObject = (v: Json): v is Record<string, Json> => typeof v === "object" && v !== null && !Array.isArray(v)

/** Mescla objetos em profundidade; listas e textos do override substituem os do padrão. */
export const deepMerge = <T,>(base: T, override: Json): T => {
  if (!isObject(base) || !isObject(override)) return (override === undefined ? base : (override as T))
  const out: Record<string, Json> = { ...base }
  for (const [k, v] of Object.entries(override)) out[k] = k in base ? deepMerge((base as Record<string, Json>)[k], v) : v
  return out as T
}

/** Caminhos de `SiteContent` que vêm da aba Mídia, não da aba Conteúdo. */
export const MEDIA_MANAGED = ["hero.cover", "about.photo", "world.photos", "creator.videos"]

const byPosition = (rows: MediaRow[], section: string, kind?: string) =>
  rows.filter((r) => r.section === section && (!kind || r.kind === kind)).sort((a, b) => a.position - b.position)

/** Troca as mídias do padrão pelas do banco, seção por seção, só onde houver mídia cadastrada. */
export const applyMedia = (content: SiteContent, rows: MediaRow[]): SiteContent => {
  const next = structuredClone(content)

  const cover = byPosition(rows, "cover", "photo")[0]
  if (cover) next.hero.cover = { src: mediaUrl(cover.path), alt: cover.alt ?? next.hero.cover.alt }

  const about = byPosition(rows, "about", "photo")[0]
  if (about) next.about.photo = { src: mediaUrl(about.path), alt: about.alt ?? next.about.photo.alt }

  const world = byPosition(rows, "world", "photo")
  if (world.length)
    next.world.photos = world.map((r) => ({
      id: r.id,
      src: mediaUrl(r.path),
      alt: r.alt ?? "",
      tag: r.title ?? "",
    }))

  const videos = byPosition(rows, "creator", "video")
  if (videos.length)
    next.creator.videos = videos.map((r) => ({
      id: r.id,
      src: mediaUrl(r.path),
      poster: r.poster_path ? mediaUrl(r.poster_path) : "",
      alt: r.alt ?? r.title ?? "Vídeo",
      reelUrl: r.reel_url ?? "",
    }))

  return next
}

export const fetchSiteContent = async (defaults: SiteContent): Promise<SiteContent> => {
  const [settings, media] = await Promise.all([
    supabase.from("site_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle(),
    supabase.from("media").select("*").eq("published", true),
  ])
  let content = defaults
  if (settings.data?.value) content = deepMerge(defaults, settings.data.value)
  if (media.data?.length) content = applyMedia(content, media.data as MediaRow[])
  return content
}

/** Para o App: devolve o padrão na hora e troca pelo conteúdo do banco quando ele chega. */
export const useSiteContent = (defaults: SiteContent): SiteContent => {
  const [content, setContent] = useState(defaults)
  useEffect(() => {
    let alive = true
    fetchSiteContent(defaults)
      .then((c) => alive && setContent(c))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [defaults])
  return content
}
