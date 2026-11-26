import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import JewelcaseFolioTemplate from "@/components/ui/jewelcase-folio-template"
import { btn, btnGhost } from "@/admin/ui"
import { supabase } from "@/lib/supabase"
import {
  baseItem, contentOf, emptyDraft, loadDraft, mediaRef, moveInArray, moveMedia, patchMedia, prepare, removeMedia, replaceMedia,
  saveDraft, setText, toggleHidden, type Draft,
} from "./draft"
import Inspector, { type Ops } from "./Inspector"

/*
 * Modo edição visual: /?edit abre o site dentro de um quadro (para o modo celular ter largura de celular de verdade)
 * e um painel ao lado (embaixo no celular). Só admin logado chega aqui; o resto do site nem baixa este código.
 * /?edit=dev, só no servidor de desenvolvimento, pula o login e não envia nada ao Supabase.
 */

const MOCK = import.meta.env.DEV && new URLSearchParams(location.search).get("edit") === "dev"

/** Visual do editor dentro do quadro do site (contornos, alvo de soltar arquivo). Sem animação. */
const CHROME = `
html,body{margin:0}
[data-edit]{cursor:pointer}
[data-edit]:hover{outline:2px dashed #ff4fa0;outline-offset:2px}
.ed-sel{outline:3px solid #ff4fa0!important;outline-offset:3px}
.ed-drop{outline:4px solid #22c55e!important;outline-offset:3px}
[draggable=true]{cursor:grab}
.jf-off{opacity:.4;outline:2px dashed #888;outline-offset:-4px}
`

const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files")
const sameList = (a: string, b: string) => a.replace(/\.\d+$/, "") === b.replace(/\.\d+$/, "")
const LIST_ITEM = /^(world\.photos|creator\.videos|collab\.services)\.\d+$/

type History = { cur: Draft; saved: Draft; past: Draft[] }

function Screen({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-svh place-items-center bg-pink-50 p-4 font-sans text-neutral-900">{children}</div>
}

export default function EditMode() {
  const [gate, setGate] = useState<"loading" | "ok" | "no">(MOCK ? "ok" : "loading")

  useEffect(() => {
    document.title = "Editar o site"
    const robots = document.createElement("meta")
    robots.name = "robots"
    robots.content = "noindex,nofollow"
    document.head.appendChild(robots)
    if (MOCK) return () => robots.remove()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return setGate("no")
      const { data: ok } = await supabase.rpc("is_admin")
      setGate(ok === true ? "ok" : "no")
    })
    return () => robots.remove()
  }, [])

  if (gate === "loading") return <Screen>Carregando...</Screen>
  if (gate === "no")
    return (
      <Screen>
        <div className="max-w-sm space-y-4 rounded-3xl bg-white p-6 text-center shadow-xl">
          <p>Para editar o site, entre primeiro no painel.</p>
          <a className={btn} href="/feca">
            Ir para o painel
          </a>
        </div>
      </Screen>
    )
  return <Editor />
}

function Editor() {
  const [h, setH] = useState<History | null>(null)
  const [device, setDevice] = useState<"mobile" | "desktop">(() => (window.matchMedia("(min-width: 1024px)").matches ? "desktop" : "mobile"))
  const [sel, setSel] = useState<string | null>(null)
  const [msg, setMsg] = useState("")
  const [busy, setBusy] = useState(false)
  const [doc, setDoc] = useState<Document | null>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const dragSrc = useRef<string | null>(null)
  const last = useRef({ key: "", at: 0 })

  useEffect(() => {
    if (MOCK) return setH({ cur: emptyDraft(), saved: emptyDraft(), past: [] })
    loadDraft()
      .then((d) => setH({ cur: d, saved: d, past: [] }))
      .catch((e) => setMsg(e.message))
  }, [])

  const dirty = !!h && h.cur !== h.saved
  const content = useMemo(() => (h ? contentOf(h.cur) : null), [h?.cur]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Aplica uma mudança no rascunho. Digitação seguida no mesmo campo vira um só passo para desfazer. */
  const change = useCallback((fn: (d: Draft) => Draft, key = "") => {
    setH((s) => {
      if (!s) return s
      const now = Date.now()
      const merge = key && last.current.key === key && now - last.current.at < 1500
      last.current = { key, at: now }
      return { ...s, past: merge ? s.past : [...s.past.slice(-49), s.cur], cur: fn(s.cur) }
    })
  }, [])

  const flash = (text: string) => setMsg(text)
  const fail = (e: unknown) => flash(e instanceof Error ? e.message : "Algo deu errado.")

  const undo = useCallback(() => {
    last.current = { key: "", at: 0 }
    setH((s) => (s && s.past.length ? { ...s, cur: s.past[s.past.length - 1], past: s.past.slice(0, -1) } : s))
  }, [])

  const save = async () => {
    if (!h || busy || !dirty) return
    setBusy(true)
    flash("Salvando...")
    try {
      if (MOCK) {
        setH({ cur: h.cur, saved: h.cur, past: [] })
        flash("Simulado: nada foi enviado (modo de teste).")
      } else {
        await saveDraft(h.saved, h.cur)
        const fresh = await loadDraft()
        setH({ cur: fresh, saved: fresh, past: [] })
        flash("Salvo! O site já mostra as mudanças.")
      }
    } catch (e) {
      fail(e)
    }
    setBusy(false)
  }

  // Aviso ao sair com mudanças não salvas
  useEffect(() => {
    if (!dirty) return
    const on = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", on)
    return () => window.removeEventListener("beforeunload", on)
  }, [dirty])

  // ── operações do painel e do arrastar-e-soltar ──────────────────────────────
  const move = (item: string, to: number) => {
    const m = /^(.*)\.(\d+)$/.exec(item)!
    const from = Number(m[2])
    const ref = mediaRef(item)
    if (ref && (ref.section === "world" || ref.section === "creator")) change((d) => moveMedia(d, ref.section, from, to))
    else change((d) => moveInArray(d, m[1], from, to))
    setSel((s) => (s === item ? `${m[1]}.${to}` : s))
  }

  const withFile = async (section: string, file: File, apply: (d: Draft, p: Awaited<ReturnType<typeof prepare>>) => Draft) => {
    setBusy(true)
    flash("Preparando o arquivo...")
    try {
      const p = await prepare(section, file)
      change((d) => apply(d, p))
      flash("Pronto. Aperte Salvar para publicar.")
    } catch (e) {
      fail(e)
    }
    setBusy(false)
  }

  const ops: Ops = {
    busy,
    text: (path, value) => change((d) => setText(d, path, value), path),
    move,
    toggle: (id) => change((d) => toggleHidden(d, id)),
    file: (path, file) => {
      const r = mediaRef(path)!
      void withFile(r.section, file, (d, p) => replaceMedia(d, r.section, r.index, p))
    },
    add: (section, file) => {
      const count = content ? (section === "world" ? content.world.photos.length : content.creator.videos.length) : 0
      void withFile(section, file, (d, p) => replaceMedia(d, section, count, p)).then(() => setSel(`${section === "world" ? "world.photos" : "creator.videos"}.${count}`))
    },
    patch: (path, patch) => {
      const r = mediaRef(path)!
      change((d) => patchMedia(d, r.section, r.index, patch), path + Object.keys(patch).join())
    },
    remove: (path) => {
      const r = mediaRef(path)!
      change((d) => removeMedia(d, r.section, r.index))
      setSel(null)
    },
    close: () => setSel(null),
  }

  // Sempre a versão mais nova dos handlers, sem religar os eventos do quadro a cada digitação
  const api = useRef({ ops, setSel, undo })
  api.current = { ops, setSel, undo }

  // ── quadro do site ──────────────────────────────────────────────────────────
  const onLoad = () => {
    const d = frame.current?.contentDocument
    if (!d) return
    // Copia o CSS da página para dentro do quadro
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((n) => d.head.appendChild(n.cloneNode(true)))
    const chrome = d.createElement("style")
    chrome.textContent = CHROME
    d.head.appendChild(chrome)
    setDoc(d)
  }

  useEffect(() => {
    if (!doc) return
    const target = (e: Event) => (e.target as Element | null)?.closest?.("[data-edit]") as HTMLElement | null
    const clear = () => doc.querySelectorAll(".ed-drop").forEach((n) => n.classList.remove("ed-drop"))
    const mark = (base: string) => {
      clear()
      doc.querySelector(`[data-edit="${base}"]`)?.classList.add("ed-drop")
    }

    const onClick = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const t = target(e)
      const s = (e.target as Element).closest?.("[data-edit-section]") as HTMLElement | null
      api.current.setSel(t ? t.dataset.edit! : s ? "section:" + s.dataset.editSection : null)
    }
    const onDragStart = (e: DragEvent) => {
      const base = target(e)?.dataset.edit && baseItem(target(e)!.dataset.edit!)
      if (!base || !LIST_ITEM.test(base)) return e.preventDefault()
      dragSrc.current = base
      e.dataTransfer?.setData("text/plain", base)
      if (e.dataTransfer) e.dataTransfer.effectAllowed = "move"
    }
    const onDragOver = (e: DragEvent) => {
      const base = target(e)?.dataset.edit && baseItem(target(e)!.dataset.edit!)
      if (!base) return clear()
      const ok = hasFiles(e) ? !!mediaRef(base) : !!dragSrc.current && sameList(dragSrc.current, base)
      if (!ok) return clear()
      e.preventDefault()
      mark(base)
    }
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      clear()
      const base = target(e)?.dataset.edit && baseItem(target(e)!.dataset.edit!)
      const src = dragSrc.current
      dragSrc.current = null
      if (!base) return
      const file = e.dataTransfer?.files?.[0]
      if (file && mediaRef(base)) {
        api.current.setSel(base)
        api.current.ops.file(base, file)
      } else if (src && src !== base && sameList(src, base)) {
        api.current.ops.move(src, Number(base.split(".").pop()))
      }
    }
    const onEnd = () => {
      dragSrc.current = null
      clear()
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !(e.target as Element).closest?.("input,textarea")) {
        e.preventDefault()
        api.current.undo()
      }
    }

    doc.addEventListener("click", onClick, true)
    doc.addEventListener("dragstart", onDragStart)
    doc.addEventListener("dragover", onDragOver)
    doc.addEventListener("drop", onDrop)
    doc.addEventListener("dragend", onEnd)
    doc.addEventListener("keydown", onKey)
    return () => {
      doc.removeEventListener("click", onClick, true)
      doc.removeEventListener("dragstart", onDragStart)
      doc.removeEventListener("dragover", onDragOver)
      doc.removeEventListener("drop", onDrop)
      doc.removeEventListener("dragend", onEnd)
      doc.removeEventListener("keydown", onKey)
    }
  }, [doc])

  // Itens de lista viram arrastáveis; o item selecionado ganha contorno. Roda de novo quando o conteúdo muda.
  useEffect(() => {
    if (!doc) return
    doc.querySelectorAll<HTMLElement>("[data-edit]").forEach((el) => {
      if (!LIST_ITEM.test(el.dataset.edit!)) return
      el.draggable = true
      el.querySelectorAll<HTMLElement>("img,video").forEach((m) => (m.draggable = true))
    })
    doc.querySelectorAll(".ed-sel").forEach((n) => n.classList.remove("ed-sel"))
    if (sel && !sel.startsWith("section:")) doc.querySelector(`[data-edit="${sel}"]`)?.classList.add("ed-sel")
    if (sel?.startsWith("section:")) doc.querySelector(`[data-edit-section="${sel.slice(8)}"]`)?.classList.add("ed-sel")
  }, [doc, sel, content])

  const leave = (e: React.MouseEvent) => {
    if (dirty && !confirm("Você tem mudanças que não foram salvas. Sair mesmo assim?")) e.preventDefault()
  }

  const btnSmall = `${btnGhost} px-3`
  return (
    <div className="flex h-svh flex-col bg-pink-50 font-sans text-neutral-900 lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-pink-100 bg-white px-3 py-2">
          <a href="/feca" onClick={leave} className="text-sm underline">
            ← Painel
          </a>
          <div className="flex gap-1" role="group" aria-label="Tamanho da tela">
            {(["mobile", "desktop"] as const).map((d) => (
              <button key={d} onClick={() => setDevice(d)} aria-pressed={device === d} className={`min-h-11 rounded-full px-4 text-sm font-semibold ${device === d ? "bg-neutral-900 text-white" : "text-neutral-700"}`}>
                {d === "mobile" ? "Celular" : "Computador"}
              </button>
            ))}
          </div>
          <span className="flex-1 text-sm text-pink-700" role="status">
            {MOCK ? "Teste local: nada é enviado. " : ""}
            {msg}
          </span>
          <button className={btnSmall} onClick={undo} disabled={!h?.past.length} aria-label="Desfazer a última mudança">
            ↶ Desfazer
          </button>
          <button className={`${btn} px-4`} onClick={save} disabled={!dirty || busy}>
            {dirty ? "Salvar •" : "Salvo"}
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden bg-neutral-200">
          {h && content ? (
            <iframe
              ref={frame}
              title="Prévia do site"
              onLoad={onLoad}
              srcDoc='<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body></body></html>'
              className="mx-auto block h-full border-0 bg-white"
              style={{ width: device === "mobile" ? "min(100%, 390px)" : "100%" }}
            />
          ) : (
            <p className="p-4 text-sm">{msg || "Carregando..."}</p>
          )}
        </div>
      </div>
      <aside className="max-h-[45svh] shrink-0 overflow-y-auto border-t border-pink-200 bg-white p-4 lg:max-h-none lg:w-[360px] lg:border-l lg:border-t-0" aria-label="Editar">
        {content && <Inspector sel={sel} content={content} ops={ops} />}
      </aside>
      {doc && content && createPortal(<JewelcaseFolioTemplate content={content} editing />, doc.body)}
    </div>
  )
}
