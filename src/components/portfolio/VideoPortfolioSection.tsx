import { Card, CardContent } from "@/components/ui/card";

const videos = [
  {
    id: 1,
    title: "Vídeo institucional",
    youtubeId: "kvF3vYaMXcM",
    isShort: false
  },
  {
    id: 2,
    title: "Conteúdo para redes",
    youtubeId: "XCpGdhPx650",
    isShort: true
  },
  {
    id: 3,
    title: "Conteúdo para redes",
    youtubeId: "W6oRs6CO9as",
    isShort: true
  },
  {
    id: 4,
    title: "Vídeo promocional",
    youtubeId: "yxbTabRN4_U",
    isShort: false
  }
];

const VideoPortfolioSection = () => {
  return (
    <section id="portfolio" className="px-6 py-16 bg-soft-cream">
      <div className="max-w-lg mx-auto space-y-8">
        {/* Section Header */}
        <div className="text-center space-y-2">
          <span className="text-sm font-medium tracking-[0.2em] text-accent uppercase">
            Portfólio
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-foreground">
            Nossos vídeos
          </h2>
          <p className="text-sm text-muted-foreground">
            Alguns dos trabalhos que realizamos
          </p>
        </div>

        {/* Video Grid */}
        <div className="grid gap-4">
          {videos.map((video) => (
            <Card key={video.id} className="border-0 shadow-sm overflow-hidden bg-white">
              <CardContent className="p-0">
                <div className={video.isShort ? "aspect-[9/16] max-h-[400px] mx-auto" : "aspect-video"}>
                  <iframe
                    src={`https://www.youtube.com/embed/${video.youtubeId}`}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VideoPortfolioSection;
