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
const BAD_KEYS = new Set(["__proto__", "constructor", "prototype"])

export const deepMerge = <T,>(base: T, override: Json): T => {
  if (!isObject(base) || !isObject(override)) return (override === undefined ? base : (override as T))
  const out: Record<string, Json> = { ...base }
  for (const [k, v] of Object.entries(override)) if (!BAD_KEYS.has(k)) out[k] = k in base ? deepMerge((base as Record<string, Json>)[k], v) : v
  return out as T
}

/** Caminhos de `SiteContent` que vêm da aba Mídia, não da aba Conteúdo. */
export const MEDIA_MANAGED = ["hero.cover", "about.photo", "world.photos", "creator.videos"]

const byPosition = (rows: MediaRow[], section: string, kind?: string) =>
  rows.filter((r) => r.section === section && (!kind || r.kind === kind)).sort((a, b) => a.position - b.position)

/** Troca as mídias do padrão pelas do banco, seção por seção, só onde houver mídia cadastrada. */
export const applyMedia = (content: SiteContent, rows: MediaRow[], urlOf: (path: string) => string = mediaUrl): SiteContent => {
  const next = structuredClone(content)

  const cover = byPosition(rows, "cover", "photo")[0]
  if (cover) next.hero.cover = { src: urlOf(cover.path), alt: cover.alt ?? next.hero.cover.alt }

  const about = byPosition(rows, "about", "photo")[0]
  if (about) next.about.photo = { src: urlOf(about.path), alt: about.alt ?? next.about.photo.alt }

  const world = byPosition(rows, "world", "photo")
  if (world.length)
    next.world.photos = world.map((r) => ({
      id: r.id,
      src: urlOf(r.path),
      alt: r.alt ?? "",
      tag: r.title ?? "",
    }))

  const videos = byPosition(rows, "creator", "video")
  if (videos.length)
    next.creator.videos = videos.map((r) => ({
      id: r.id,
      src: urlOf(r.path),
      poster: r.poster_path ? urlOf(r.poster_path) : "",
      alt: r.alt ?? r.title ?? "Vídeo",
      reelUrl: r.reel_url ?? "",
    }))

  return next
}

/** Leitura semanal dos perfis (api/metrics.ts), chave "metrics" em site_settings. `auto: false` = só vale o que foi digitado na aba Números. */
export type AutoMetrics = {
  auto: boolean
  readAt: string
  instagram: { followers: number | null; posts: number | null }
  tiktok: { followers: number | null; likes: number | null; videos: number | null }
  status?: { instagram: string; tiktok: string }
}

const nf = new Intl.NumberFormat("pt-BR")

/** Troca, número a número, o valor digitado pelo lido do perfil; o que não foi lido continua como está. */
export const applyMetrics = (content: SiteContent, m: AutoMetrics | null | undefined): SiteContent => {
  if (!m || m.auto === false) return content
  const next = structuredClone(content)
  const read: Record<string, Record<string, number | null>> = {
    Instagram: { seguidores: m.instagram.followers, posts: m.instagram.posts },
    TikTok: { seguidores: m.tiktok.followers, curtidas: m.tiktok.likes, vídeos: m.tiktok.videos },
  }
  let used = false
  for (const s of next.mediaKit.socials)
    for (const metric of s.metrics) {
      const v = read[s.network]?.[metric.label]
      if (typeof v === "number") {
        metric.value = nf.format(v)
        used = true
      }
    }
  if (used) next.mediaKit.note = `Números públicos lidos em ${new Date(m.readAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`
  return next
}

export const fetchSiteContent = async (defaults: SiteContent): Promise<SiteContent> => {
  const [settings, media, metrics] = await Promise.all([
    supabase.from("site_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle(),
    supabase.from("media").select("*").eq("published", true),
    supabase.from("site_settings").select("value").eq("key", "metrics").maybeSingle(),
  ])
  let content = defaults
  if (settings.data?.value) content = deepMerge(defaults, settings.data.value)
  if (media.data?.length) content = applyMedia(content, media.data as MediaRow[])
  return applyMetrics(content, metrics.data?.value as AutoMetrics | undefined)
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
