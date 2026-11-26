import { fileURLToPath, URL } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// og:image precisa de URL absoluta; a Vercel informa o domínio de produção no build.
const siteUrl = () => {
  const host = process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  return host ? (host.startsWith("http") ? host : "https://" + host).replace(/\/$/, "") : ""
}

export default defineConfig({
  plugins: [react(), tailwindcss(), { name: "site-url", transformIndexHtml: (html: string) => html.replaceAll("__SITE_URL__", siteUrl()) }],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
})
