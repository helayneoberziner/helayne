import { supabase } from "@/lib/supabase"

export const MAX_VIDEO = 50 * 1024 * 1024 // limite do plano gratuito do Supabase por arquivo

const canvasToWebp = (canvas: HTMLCanvasElement, quality = 0.85) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Não consegui converter a imagem."))), "image/webp", quality),
  )

/** Foto vira webp com no máximo 1600px no lado maior: leve para o celular de quem abre o site. */
export async function toWebp(file: Blob, max = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvasToWebp(canvas)
}

/** Primeiro quadro do vídeo, usado como poster enquanto o mp4 carrega. */
export async function posterFrom(file: Blob): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const video = document.createElement("video")
    video.muted = true
    video.playsInline = true
    video.preload = "auto"
    video.src = url
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve()
      video.onerror = () => reject(new Error("Não consegui ler o vídeo."))
    })
    const seeked = new Promise<void>((resolve) => (video.onseeked = () => resolve()))
    video.currentTime = Math.min(0.5, (video.duration || 1) / 2)
    await seeked
    const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height)
    return await canvasToWebp(canvas, 0.8)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function upload(path: string, body: Blob, contentType: string) {
  const { error } = await supabase.storage.from("media").upload(path, body, { contentType, cacheControl: "31536000" })
  if (error) throw error
}
