# Media kit · Helayne Oberziner

Site de uma página (React 18 + Vite 6 + Tailwind v4) no visual Y2K "jewelcase folio".

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run build      # saída em dist/
```

- Conteúdo (textos, links, métricas, ordem de fotos e vídeos): `src/content/site.ts`
- Layout: `src/components/ui/jewelcase-folio-template.tsx`, que recebe o conteúdo pela prop `content`
- Fotos em `public/img/`, vídeos e posters em `public/video/`

Base visual: template "Jewelcase Folio" (MIT). A licença original está em `LICENSE`.
