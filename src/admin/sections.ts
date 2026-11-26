import type { MediaKind } from "@/lib/supabase"

/** Seções de mídia que o painel entende. O `id` é o mesmo usado em `src/lib/siteContent.ts` (applyMedia). */
export const SECTIONS: { id: string; label: string; help: string; kinds: MediaKind[]; single?: boolean }[] = [
  { id: "cover", label: "Capa (foto de apoio)", help: "Esta foto não aparece mais no topo do site: o retrato recortado da hero é fixo no código (hero.portrait).", kinds: ["photo"], single: true },
  { id: "about", label: "Sobre mim", help: "A foto ao lado do texto de apresentação.", kinds: ["photo"], single: true },
  { id: "world", label: "My little world", help: "Mosaico de fotos (moda, beleza, viagem, lifestyle). A ordem aqui é a ordem no site. O campo Etiqueta aparece como fita sobre a foto.", kinds: ["photo"] },
  { id: "creator", label: "Creator side (vídeos)", help: "Vídeos mp4 (até 50 MB). Tocam sozinhos, mudos, e ao tocar abrem o Reel do Instagram.", kinds: ["video"] },
]
