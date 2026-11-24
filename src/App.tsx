import JewelcaseFolioTemplate from "@/components/ui/jewelcase-folio-template"
import { site } from "@/content/site"
import { useSiteContent } from "@/lib/siteContent"

export default function App() {
  const content = useSiteContent(site)
  return <JewelcaseFolioTemplate content={content} />
}
