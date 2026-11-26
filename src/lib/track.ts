import { supabase } from "./supabase"

// Contador próprio: um id anônimo por navegador, sem cookies de terceiros. Vai para a tabela `events`.
const VISITOR_KEY = "feca_visitor"
const SKIP_KEY = "feca_no_track" // ligado quando a Helayne entra no /feca, para as próprias visitas não contarem

type EventType = "view" | "click" | "video_play"

const visitorId = () => {
  try {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

const skip = () => {
  try {
    return localStorage.getItem(SKIP_KEY) === "1"
  } catch {
    return false
  }
}

export const setTrackingEnabled = (enabled: boolean) => {
  try {
    if (enabled) localStorage.removeItem(SKIP_KEY)
    else localStorage.setItem(SKIP_KEY, "1")
  } catch {
    /* navegador sem localStorage: nada a fazer */
  }
}

const source = (): string | null => {
  const params = new URLSearchParams(location.search)
  const utm = params.get("utm_source") ?? params.get("ref")
  if (utm) return utm.toLowerCase().slice(0, 40)
  if (!document.referrer) return null
  try {
    const host = new URL(document.referrer).hostname.replace(/^www\./, "")
    if (host === location.hostname) return null
    if (/instagram/.test(host)) return "instagram"
    if (/tiktok/.test(host)) return "tiktok"
    if (/google/.test(host)) return "google"
    if (/whatsapp|wa\.me/.test(host)) return "whatsapp"
    if (/facebook|fb\.com/.test(host)) return "facebook"
    return host.slice(0, 40)
  } catch {
    return null
  }
}

const device = () => (innerWidth < 640 ? "mobile" : innerWidth < 1024 ? "tablet" : "desktop")

const send = (type: EventType, target?: string) => {
  if (skip()) return
  void supabase
    .from("events")
    .insert({
      visitor_id: visitorId(),
      type,
      target: target?.slice(0, 200) ?? null,
      path: location.pathname.slice(0, 200),
      referrer: document.referrer ? document.referrer.slice(0, 300) : null,
      source: source(),
      device: device(),
    })
    .then(() => undefined)
}

export const trackView = () => send("view")

/** Envio do formulário de contato: conta como clique "form". */
export const trackForm = () => send("click", "form")

/** Cliques em links: e-mail, redes, e Reels (conta como "video_play"). */
export const installClickTracking = () => {
  document.addEventListener(
    "click",
    (event) => {
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null
      if (!link) return
      const href = link.getAttribute("href") ?? ""
      const reel = href.match(/instagram\.com\/reel\/([\w-]+)/)
      if (reel) return send("video_play", `reel:${reel[1]}`)
      if (href.startsWith("mailto:")) return send("click", "email")
      if (/instagram\.com/.test(href)) return send("click", "instagram")
      if (/tiktok\.com/.test(href)) return send("click", "tiktok")
    },
    { capture: true },
  )
}
