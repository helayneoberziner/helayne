import { useCallback, useEffect, useState } from "react"
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { site } from "@/content/site"
import { mediaUrl, supabase, type MediaRow } from "@/lib/supabase"
import { SECTIONS } from "./sections"
import { MAX_VIDEO, posterFrom, toWebp, upload } from "./mediaTools"
import { btn, btnGhost, card, field } from "./ui"


async function removeFiles(rows: MediaRow[]) {
  const paths = rows.flatMap((r) => [r.path, r.poster_path].filter((p): p is string => !!p))
  if (paths.length) await supabase.storage.from("media").remove(paths)
  if (rows.length)
    await supabase
      .from("media")
      .delete()
      .in(
        "id",
        rows.map((r) => r.id),
      )
}

type Draft = { title: string; alt: string; reel_url: string; published: boolean }

function Item({ row, sectionId, onChanged }: { row: MediaRow; sectionId: string; onChanged: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id })
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>({
    title: row.title ?? "",
    alt: row.alt ?? "",
    reel_url: row.reel_url ?? "",
    published: row.published,
  })
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    await supabase
      .from("media")
      .update({
        title: draft.title || null,
        alt: draft.alt || null,
        reel_url: draft.reel_url || null,
        published: draft.published,
      })
      .eq("id", row.id)
    setBusy(false)
    setOpen(false)
    onChanged()
  }

  const remove = async () => {
    if (!confirm("Apagar este item? Não dá para desfazer.")) return
    setBusy(true)
    await removeFiles([row])
    onChanged()
  }

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }
  const isVideo = row.kind === "video"

  return (
    <li ref={setNodeRef} style={style} className={`${card} flex flex-col gap-3 ${row.published ? "" : "opacity-60"}`}>
      <div className="relative overflow-hidden rounded-2xl bg-pink-100">
        {isVideo ? (
          <video
            src={mediaUrl(row.path)}
            poster={row.poster_path ? mediaUrl(row.poster_path) : undefined}
            muted
            playsInline
            preload="metadata"
            className="aspect-[9/16] w-full object-cover"
          />
        ) : (
          <img src={mediaUrl(row.path)} alt={row.alt ?? ""} loading="lazy" className="aspect-[4/5] w-full object-cover" />
        )}
        {!row.published && <span className="absolute left-2 top-2 rounded-full bg-neutral-900 px-2 py-1 text-xs text-white">oculto</span>}
        <button
          {...attributes}
          {...listeners}
          aria-label="Arrastar para mudar a ordem"
          className="absolute right-2 top-2 grid size-11 touch-none place-items-center rounded-full bg-white/90 text-xl shadow"
        >
          ⠿
        </button>
      </div>
      <p className="truncate text-sm font-semibold">{row.title || row.alt || (isVideo ? "Vídeo" : "Foto")}</p>
      <div className="flex gap-2">
        <button className={`${btnGhost} flex-1`} onClick={() => setOpen((v) => !v)}>
          {open ? "Fechar" : "Editar"}
        </button>
        <button className={`${btnGhost} text-pink-700`} onClick={remove} disabled={busy}>
          Apagar
        </button>
      </div>
      {open && (
        <div className="space-y-3">
          <label className="block text-sm">
            {sectionId === "world" ? "Etiqueta (fita sobre a foto)" : "Título"}
            <input className={field} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </label>
          <label className="block text-sm">
            Descrição (para leitores de tela)
            <input className={field} value={draft.alt} onChange={(e) => setDraft({ ...draft, alt: e.target.value })} />
          </label>
          {isVideo && (
            <label className="block text-sm">
              Link do Reel no Instagram
              <input
                className={field}
                inputMode="url"
                placeholder="https://www.instagram.com/reel/..."
                value={draft.reel_url}
                onChange={(e) => setDraft({ ...draft, reel_url: e.target.value })}
              />
            </label>
          )}
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} />
            Aparece no site
          </label>
          <button className={`${btn} w-full`} onClick={save} disabled={busy}>
            Salvar
          </button>
        </div>
      )}
    </li>
  )
}

export default function MediaManager() {
  const [sectionId, setSectionId] = useState(SECTIONS[0].id)
  const section = SECTIONS.find((s) => s.id === sectionId)!
  const [rows, setRows] = useState<MediaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  )

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from("media").select("*").eq("section", sectionId).order("position")
    setRows((data ?? []) as MediaRow[])
    setLoading(false)
  }, [sectionId])

  useEffect(() => {
    setMsg("")
    load()
  }, [load])

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const from = rows.findIndex((r) => r.id === e.active.id)
    const to = rows.findIndex((r) => r.id === e.over!.id)
    const next = arrayMove(rows, from, to)
    setRows(next)
    await Promise.all(next.map((r, i) => supabase.from("media").update({ position: i }).eq("id", r.id)))
    setMsg("Ordem salva.")
  }

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    const previous = rows
    let position = rows.length
    try {
      for (const file of Array.from(files)) {
        const isVideo = file.type === "video/mp4"
        const isImage = file.type.startsWith("image/")
        if (!isVideo && !isImage) throw new Error(`"${file.name}": use foto (jpg, png, webp) ou vídeo mp4.`)
        if (isVideo && !section.kinds.includes("video")) throw new Error("Esta seção só aceita fotos.")
        if (isImage && !section.kinds.includes("photo")) throw new Error("Esta seção só aceita vídeos mp4.")
        if (isVideo && file.size > MAX_VIDEO) throw new Error(`"${file.name}" tem mais de 50 MB. Comprima o vídeo e tente de novo.`)

        setMsg(`Enviando ${file.name}...`)
        const id = crypto.randomUUID()
        let path: string
        let posterPath: string | null = null
        if (isVideo) {
          path = `${sectionId}/${id}.mp4`
          await upload(path, file, "video/mp4")
          posterPath = `${sectionId}/${id}-poster.webp`
          await upload(posterPath, await posterFrom(file), "image/webp")
        } else {
          path = `${sectionId}/${id}.webp`
          await upload(path, await toWebp(file), "image/webp")
        }
        const { error } = await supabase.from("media").insert({
          kind: isVideo ? "video" : "photo",
          section: sectionId,
          path,
          poster_path: posterPath,
          position: position++,
        })
        if (error) throw error
      }
      // Seções de uma foto só (capa, sobre): a nova substitui a antiga.
      if (section.single && previous.length) await removeFiles(previous)
      setMsg("Pronto! Já está no site.")
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Algo deu errado no envio.")
    }
    setBusy(false)
    load()
  }

  /** Traz para o banco as mídias que já estão no código, para poder reordenar e editar. */
  const importCurrent = async () => {
    const defaults: { kind: "photo" | "video"; src: string; poster?: string; alt: string; title?: string; reel?: string }[] =
      sectionId === "cover"
        ? [{ kind: "photo", src: site.hero.cover.src, alt: site.hero.cover.alt }]
        : sectionId === "about"
          ? [{ kind: "photo", src: site.about.photo.src, alt: site.about.photo.alt }]
          : sectionId === "world"
            ? site.world.photos.filter((p) => p.src).map((p) => ({ kind: "photo" as const, src: p.src!, alt: p.alt, title: p.tag }))
            : site.creator.videos.map((v) => ({ kind: "video" as const, src: v.src, poster: v.poster, alt: v.alt, reel: v.reelUrl }))

    setBusy(true)
    try {
      let position = 0
      for (const item of defaults) {
        setMsg(`Importando ${item.src}...`)
        const res = await fetch(item.src)
        const blob = await res.blob()
        const want = item.kind === "video" ? "video/" : "image/"
        if (!res.ok || !blob.type.startsWith(want)) throw new Error(`Arquivo não encontrado: ${item.src}`)
        const id = crypto.randomUUID()
        const ext = item.kind === "video" ? "mp4" : "webp"
        const path = `${sectionId}/${id}.${ext}`
        await upload(path, blob, item.kind === "video" ? "video/mp4" : blob.type)
        let posterPath: string | null = null
        if (item.poster) {
          const p = await fetch(item.poster)
          const pb = await p.blob()
          if (p.ok && pb.type.startsWith("image/")) {
            posterPath = `${sectionId}/${id}-poster.webp`
            await upload(posterPath, pb, pb.type)
          }
        }
        const { error } = await supabase.from("media").insert({
          kind: item.kind,
          section: sectionId,
          path,
          poster_path: posterPath,
          reel_url: item.reel ?? null,
          title: item.title ?? null,
          alt: item.alt,
          position: position++,
        })
        if (error) throw error
      }
      setMsg("Importado. Agora dá para arrastar e editar.")
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Não consegui importar.")
    }
    setBusy(false)
    load()
  }

  const accept = [section.kinds.includes("photo") ? "image/*" : "", section.kinds.includes("video") ? "video/mp4" : ""].filter(Boolean).join(",")

  return (
    <div className="space-y-4">
      <div className={`${card} space-y-3`}>
        <label className="block text-sm font-semibold">
          Seção
          <select className={`${field} mt-1`} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            {SECTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-neutral-600">{section.help}</p>
        <label className={`${btn} w-full cursor-pointer ${busy ? "pointer-events-none opacity-40" : ""}`}>
          {section.single ? "Trocar foto" : "Adicionar"}
          <input
            type="file"
            className="sr-only"
            accept={accept}
            multiple={!section.single}
            disabled={busy}
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ""
            }}
          />
        </label>
        {msg && (
          <p className="text-sm text-pink-700" role="status">
            {msg}
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-sm">Carregando...</p>
      ) : rows.length === 0 ? (
        <div className={`${card} space-y-3`}>
          <p className="text-sm">
            Nenhum item salvo aqui ainda: o site está mostrando o conteúdo padrão. Importe o que já está no site para poder reordenar e editar.
          </p>
          <button className={btnGhost} onClick={importCurrent} disabled={busy}>
            Importar o que está no site
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={rows.map((r) => r.id)} strategy={rectSortingStrategy}>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {rows.map((row) => (
                <Item key={row.id} row={row} sectionId={sectionId} onChanged={load} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
