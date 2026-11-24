import { StrictMode, Suspense, lazy } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import { installClickTracking, trackView } from "./lib/track"
import "./index.css"

// /feca é o painel da Helayne: carrega só quando a rota é essa, então o site público não paga por ele.
const Admin = lazy(() => import("./admin/Admin"))
const isAdminRoute = location.pathname.replace(/\/+$/, "") === "/feca"

if (!isAdminRoute) {
  trackView()
  installClickTracking()
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isAdminRoute ? (
      <Suspense fallback={null}>
        <Admin />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
