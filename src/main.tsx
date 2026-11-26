import { StrictMode, Suspense, lazy } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import { installClickTracking, trackView } from "./lib/track"
import "./index.css"

// /feca é o painel da Helayne: carrega só quando a rota é essa, então o site público não paga por ele.
const Admin = lazy(() => import("./admin/Admin"))
const isAdminRoute = location.pathname.replace(/\/+$/, "") === "/feca"
// ?edit abre o modo edição visual (só admin logado vê); o código dele só baixa nesse caso.
const Edit = lazy(() => import("./editmode/EditMode"))
const isEdit = !isAdminRoute && new URLSearchParams(location.search).has("edit")

if (!isAdminRoute && !isEdit) {
  trackView()
  installClickTracking()
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isAdminRoute || isEdit ? (
      <Suspense fallback={null}>{isAdminRoute ? <Admin /> : <Edit />}</Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
