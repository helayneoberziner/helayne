import { Card, CardContent } from "@/components/ui/card";
import { Play } from "lucide-react";

// Placeholder videos - replace with actual YouTube links
const videos = [
  {
    id: 1,
    title: "Vídeo institucional",
    thumbnail: null,
    youtubeUrl: ""
  },
  {
    id: 2,
    title: "Conteúdo para redes",
    thumbnail: null,
    youtubeUrl: ""
  },
  {
    id: 3,
    title: "Anúncio comercial",
    thumbnail: null,
    youtubeUrl: ""
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
                <div className="aspect-video bg-gradient-to-br from-champagne to-rose-gold-light flex flex-col items-center justify-center relative">
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                    <Play className="w-7 h-7 text-accent ml-1" />
                  </div>
                  <span className="absolute bottom-4 left-4 text-sm font-medium text-foreground/70">
                    {video.title}
                  </span>
                  {!video.youtubeUrl && (
                    <span className="absolute top-4 right-4 text-xs bg-white/80 px-2 py-1 rounded-full text-muted-foreground">
                      Em breve
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground italic">
          * Vídeos serão adicionados em breve
        </p>
      </div>
    </section>
  );
};

export default VideoPortfolioSection;
