/*
 * Todo o conteúdo do site da Helayne mora aqui: textos, links, métricas e a ordem das mídias.
 * O componente (jewelcase-folio-template.tsx) só recebe `SiteContent` por prop; o painel /feca
 * poderá trocar este objeto por dados do Supabase sem tocar no layout.
 */

/** Foto da galeria. Sem `src`, o layout mostra uma moldura "sua foto aqui". */
export type Photo = {
  id: string
  src?: string
  alt: string
  /** Etiqueta (fita) exibida sobre a foto, ex.: "Moda". */
  tag: string
}

/** Vídeo curto: toca sozinho, mudo, em loop; o card inteiro abre o Reel. */
export type Video = {
  id: string
  src: string
  poster: string
  alt: string
  reelUrl: string
}

export type Metric = { label: string; value: string }

export type SocialStat = {
  network: string
  handle: string
  url: string
  metrics: Metric[]
}

export type Service = { title: string; text: string }

export type SiteContent = {
  name: string
  city: string
  email: string
  year: string
  hero: {
    greeting: string
    nameWord: string
    cover: { src: string; alt: string }
    stickers: { heart: string; green: string; orange: [string, string]; bubble: [string, string] }
    tab: string
  }
  about: {
    heading: string
    bio: string[]
    factsTitle: string
    facts: { label: string; value: string }[]
    photo: { src: string; alt: string }
    phrase: string
  }
  world: { a: string; b: string; note: string; phrase: string; photos: Photo[]; placeholderLabel: string }
  creator: { a: string; b: string; note: string; phrase: string; videos: Video[]; openLabel: string }
  collab: { a: string; b: string; note: string; phrase: string; services: Service[] }
  mediaKit: {
    a: string
    b: string
    note: string
    socials: SocialStat[]
    soonTitle: string
    soon: string[]
    soonNote: string
    /** Preenchido pela aba Números do painel; com algum valor, substitui o bloco "Em breve". */
    audience: { title: string; items: Metric[] }
  }
  contact: {
    word: string
    phrase: string
    links: { label: string; value: string; href: string }[]
    fine: string
  }
}

const reel = (id: string) => `https://www.instagram.com/reel/${id}/`
const EMAIL = "contato@agenciaracun.com"

export const site: SiteContent = {
  name: "Helayne Oberziner",
  city: "Blumenau, SC",
  email: EMAIL,
  year: "2026",
  hero: {
    greeting: "oi, eu sou a",
    nameWord: "HELAYNE",
    cover: { src: "/img/capa.webp", alt: "Retrato de Helayne Oberziner em estúdio, impresso num CD rosa" },
    stickers: {
      heart: "media kit",
      green: "lifestyle",
      orange: ["moda &", "humor"],
      bubble: ["let's", "collab"],
    },
    tab: "Sobre mim",
  },
  about: {
    heading: "Oi, eu sou a Helayne",
    bio: [
      "Criadora de conteúdo de Blumenau, SC, com um jeito leve de falar de **lifestyle, moda e humor**. Meu lema: transformar momentos em conteúdo.",
      "Sou também co-fundadora da **Racun Filmes**, então olho para cada vídeo com cabeça de criadora e de produtora.",
      "Este é o meu media kit: o que eu faço, como posso trabalhar com a sua marca e onde me encontrar.",
    ],
    factsTitle: "Em poucas palavras",
    facts: [
      { label: "Nichos", value: "Lifestyle • Moda • Humor" },
      { label: "Cidade", value: "Blumenau, SC" },
      { label: "Redes", value: "Instagram e TikTok" },
      { label: "Também", value: "Co-fundadora da Racun Filmes" },
    ],
    photo: { src: "/img/selfie.webp", alt: "Selfie de Helayne Oberziner" },
    phrase: "transformando momentos em conteúdo",
  },
  world: {
    a: "MY LITTLE",
    b: "WORLD",
    note: "Moda, beleza, viagem e lifestyle: um pedacinho de tudo o que faz parte do meu dia a dia.",
    phrase: "a little bit of everything",
    placeholderLabel: "sua foto aqui",
    photos: [
      { id: "moda-1", src: "/img/vestido-preto.webp", alt: "Helayne de vestido preto, em clima de cena de filme", tag: "Moda" },
      { id: "beleza-1", src: "/img/selfie.webp", alt: "Selfie de Helayne", tag: "Beleza" },
      { id: "viagem-1", src: "/img/por-do-sol.webp", alt: "Helayne de jaqueta branca ao pôr do sol", tag: "Viagem" },
      { id: "lifestyle-1", src: "/img/shopping-vivara.webp", alt: "Helayne no shopping com sacolas da Vivara", tag: "Lifestyle" },
      { id: "moda-2", src: "/img/shopping-casaco.webp", alt: "Helayne no shopping com casaco de pelos", tag: "Moda" },
      { id: "livre-1", alt: "Espaço reservado para mais uma foto", tag: "Em breve" },
    ],
  },
  creator: {
    a: "THE CREATOR",
    b: "SIDE",
    note: "Reels e publis do dia a dia. Toque em um vídeo para assistir no Instagram.",
    phrase: "play it",
    openLabel: "Ver no Instagram",
    videos: [
      { id: "reel-1", src: "/video/reel-1.mp4", poster: "/video/reel-1-poster.webp", alt: "Reel de Helayne escolhendo roupas numa loja", reelUrl: reel("DfVudGLt9FD") },
      { id: "reel-2", src: "/video/reel-2.mp4", poster: "/video/reel-2-poster.webp", alt: "Reel de Helayne com decoração de Natal", reelUrl: reel("DfybZHXt-Og") },
      { id: "reel-3", src: "/video/reel-3.mp4", poster: "/video/reel-3-poster.webp", alt: "Reel de Helayne passeando pelo shopping", reelUrl: reel("Df7TGKKRD6e") },
      { id: "reel-4", src: "/video/reel-4.mp4", poster: "/video/reel-4-poster.webp", alt: "Reel de Helayne no circo", reelUrl: reel("Df-ER2VRS79") },
    ],
  },
  collab: {
    a: "LET'S",
    b: "COLLAB",
    note: "Do conteúdo pensado para a sua marca até a presença no seu evento.",
    phrase: "let's make something cute",
    services: [
      { title: "Publicidade e divulgação", text: "Reels, stories e posts que apresentam a sua marca ou produto com a minha voz e o meu humor." },
      { title: "Produção de conteúdo", text: "Roteiro, captação e edição com a estrutura da Racun Filmes, entregando vídeo pronto para a sua conta." },
      { title: "UGC", text: "Vídeos no formato de usuária real, para você usar nos seus anúncios e nas suas redes." },
      { title: "Presença em eventos e experiências", text: "Cobertura de lançamentos, inaugurações e ações, com conteúdo feito na hora." },
    ],
  },
  mediaKit: {
    a: "MEDIA",
    b: "KIT",
    note: "Números públicos lidos em 24/11/2026.",
    socials: [
      {
        network: "Instagram",
        handle: "@helayne_oberziner",
        url: "https://www.instagram.com/helayne_oberziner/",
        metrics: [
          { label: "seguidores", value: "2.045" },
          { label: "posts", value: "119" },
        ],
      },
      {
        network: "TikTok",
        handle: "@helayne_oberziner",
        url: "https://www.tiktok.com/@helayne_oberziner",
        metrics: [
          { label: "seguidores", value: "314" },
          { label: "curtidas", value: "7.085" },
          { label: "vídeos", value: "133" },
        ],
      },
    ],
    soonTitle: "Em breve",
    soon: ["Perfil do público (idade, gênero e cidade)", "Alcance", "Engajamento"],
    soonNote: "Ainda não coletei esses dados. Eles entram aqui assim que estiverem disponíveis.",
    audience: {
      title: "Público e alcance",
      items: [
        { label: "Faixa etária principal", value: "" },
        { label: "Gênero", value: "" },
        { label: "Principais cidades", value: "" },
        { label: "Alcance mensal", value: "" },
        { label: "Engajamento", value: "" },
      ],
    },
  },
  contact: {
    word: "LET'S TALK",
    phrase: "me chama pra conversar",
    links: [
      { label: "E-mail", value: EMAIL, href: "mailto:" + EMAIL },
      { label: "Instagram", value: "@helayne_oberziner", href: "https://www.instagram.com/helayne_oberziner/" },
      { label: "TikTok", value: "@helayne_oberziner", href: "https://www.tiktok.com/@helayne_oberziner" },
      { label: "Cidade", value: "Blumenau, SC", href: "mailto:" + EMAIL + "?subject=Parceria" },
    ],
    fine: "© 2026 Helayne Oberziner · Blumenau, SC · Métricas públicas lidas em 24/11/2026.",
  },
}
