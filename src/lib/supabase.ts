import { createClient } from "@supabase/supabase-js"

// Chave "publishable" é pública por desenho: a segurança vem das regras RLS do banco (supabase/migrations).
const url = import.meta.env.VITE_SUPABASE_URL ?? "https://ejledeusgkdwfnxydbku.supabase.co"
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_oMk7EO8dhmI6p8PjN4772A_EgkWp7Uy"

// O link do e-mail de convite/recuperação chega com o tipo no `#hash`; o cliente apaga o hash ao iniciar, então guardo antes.
export const authHash = typeof location !== "undefined" ? location.hash : ""

export const supabase = createClient(url, key)

export type MediaKind = "photo" | "video"

export type MediaRow = {
  id: string
  kind: MediaKind
  section: string
  path: string
  poster_path: string | null
  reel_url: string | null
  title: string | null
  alt: string | null
  position: number
  published: boolean
  created_at: string
}

export const mediaUrl = (path: string) => supabase.storage.from("media").getPublicUrl(path).data.publicUrl
