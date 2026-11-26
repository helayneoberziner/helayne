import { useEffect, useState, type FormEvent } from "react"
import type { Session } from "@supabase/supabase-js"
import { authHash, supabase } from "@/lib/supabase"
import { setTrackingEnabled } from "@/lib/track"
import Analytics from "./Analytics"
import ContentEditor from "./ContentEditor"
import Leads, { countUnread } from "./Leads"
import Links from "./Links"
import MediaManager from "./MediaManager"
import Numbers from "./Numbers"
import { btn, btnGhost, field } from "./ui"

type Tab = "visitas" | "contatos" | "midia" | "numeros" | "conteudo" | "links"

const TABS: { id: Tab; label: string }[] = [
  { id: "visitas", label: "Visitas" },
  { id: "contatos", label: "Contatos" },
  { id: "midia", label: "Fotos e vídeos" },
  { id: "numeros", label: "Números" },
  { id: "conteudo", label: "Textos" },
  { id: "links", label: "Links" },
]

function Screen({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-svh place-items-center bg-pink-50 p-4 font-sans text-neutral-900">{children}</div>
}

function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  // O link do e-mail vale uma vez só: se o leitor de e-mail já "abriu" ele, ou passou 1h, volta para cá com este erro no #hash.
  const [msg, setMsg] = useState(
    /error_code=otp_expired|error=access_denied/.test(authHash)
      ? "Esse link já foi usado ou expirou. Digite seu e-mail, toque em “Esqueci a senha” e abra o novo link logo que chegar, uma vez só."
      : ""
  )
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMsg("E-mail ou senha incorretos.")
    setBusy(false)
  }

  const forgot = async () => {
    if (!email) return setMsg("Digite o e-mail acima e toque em esqueci a senha de novo.")
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/feca` })
    setMsg(error ? "Não consegui enviar o e-mail agora." : "Se esse e-mail tem acesso, o link para criar uma nova senha chegou na caixa de entrada.")
  }

  return (
    <Screen>
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-black tracking-tight">feca ✦</h1>
        <p className="text-sm text-neutral-600">Painel da Helayne</p>
        <input className={field} type="email" autoComplete="username" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={field} type="password" autoComplete="current-password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {msg && <p className="text-sm text-pink-700">{msg}</p>}
        <button className={`${btn} w-full`} disabled={busy}>
          {busy ? "Entrando..." : "Entrar"}
        </button>
        <button type="button" onClick={forgot} className="w-full text-center text-sm text-neutral-600 underline">
          Esqueci a senha
        </button>
      </form>
    </Screen>
  )
}

function NewPassword({ done }: { done: () => void }) {
  const [password, setPassword] = useState("")
  const [msg, setMsg] = useState("")

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return setMsg("Use pelo menos 8 caracteres.")
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setMsg("Não consegui salvar a senha. Tente de novo.")
    else done()
  }

  return (
    <Screen>
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-black tracking-tight">Nova senha</h1>
        <input className={field} type="password" autoComplete="new-password" placeholder="Nova senha (8+ caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {msg && <p className="text-sm text-pink-700">{msg}</p>}
        <button className={`${btn} w-full`}>Salvar senha</button>
      </form>
    </Screen>
  )
}

export default function Admin() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  // Convite por e-mail ou "esqueci a senha": a pessoa cria a própria senha aqui mesmo, sem digitar em nenhum outro lugar.
  const [recovery, setRecovery] = useState(/type=(invite|recovery)/.test(authHash))
  const [tab, setTab] = useState<Tab>("visitas")
  const [unread, setUnread] = useState(0)
  const refreshUnread = () => void countUnread().then(setUnread)

  useEffect(() => {
    document.title = "feca"
    const robots = document.createElement("meta")
    robots.name = "robots"
    robots.content = "noindex,nofollow"
    document.head.appendChild(robots)

    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === "PASSWORD_RECOVERY") setRecovery(true)
    })
    return () => {
      data.subscription.unsubscribe()
      robots.remove()
    }
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return setIsAdmin(null)
    supabase.rpc("is_admin").then(({ data }) => {
      setIsAdmin(data === true)
      // As visitas da própria Helayne não entram na contagem do site.
      if (data === true) {
        setTrackingEnabled(false)
        refreshUnread()
      }
    })
  }, [userId])

  if (session === undefined) return <Screen>Carregando...</Screen>
  if (!session) return <Login />
  if (recovery) return <NewPassword done={() => setRecovery(false)} />
  if (isAdmin === null) return <Screen>Carregando...</Screen>
  if (!isAdmin)
    return (
      <Screen>
        <div className="max-w-sm space-y-4 rounded-3xl bg-white p-6 text-center shadow-xl">
          <p>Essa conta não tem acesso ao painel.</p>
          <button className={btnGhost} onClick={() => supabase.auth.signOut()}>
            Sair
          </button>
        </div>
      </Screen>
    )

  return (
    <div className="min-h-svh bg-pink-50 font-sans text-neutral-900">
      <header className="sticky top-0 z-10 border-b border-pink-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
          <strong className="text-lg font-black tracking-tight">feca ✦</strong>
          <nav className="flex flex-1 gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`min-h-11 whitespace-nowrap rounded-full px-4 text-sm font-semibold ${tab === t.id ? "bg-neutral-900 text-white" : "text-neutral-700"}`}
              >
                {t.label}
                {t.id === "contatos" && unread > 0 && <span className="ml-1.5 rounded-full bg-pink-600 px-1.5 py-0.5 text-xs text-white">{unread}</span>}
              </button>
            ))}
          </nav>
          <a href="/?edit" className="whitespace-nowrap rounded-full bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white">
            Editar o site
          </a>
          <a href="/" target="_blank" rel="noopener" className="hidden text-sm underline sm:block">
            Ver site
          </a>
          <button className="text-sm text-neutral-600 underline" onClick={() => supabase.auth.signOut()}>
            Sair
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 pb-24">
        {tab === "visitas" && <Analytics />}
        {tab === "contatos" && <Leads onChange={refreshUnread} />}
        {tab === "midia" && <MediaManager />}
        {tab === "numeros" && <Numbers />}
        {tab === "conteudo" && <ContentEditor />}
        {tab === "links" && <Links />}
      </main>
    </div>
  )
}
