import { Image } from "lucide-react";

// Placeholder for photos - to be added manually later
const photos = [1, 2, 3, 4, 5, 6];

const PhotoPortfolioSection = () => {
  return (
    <section className="px-6 py-16 bg-background">
      <div className="max-w-lg mx-auto space-y-8">
        {/* Section Header */}
        <div className="text-center space-y-2">
          <span className="text-sm font-medium tracking-[0.2em] text-accent uppercase">
            Galeria
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-foreground">
            Nossas fotos
          </h2>
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            <div
              key={photo}
              className="aspect-square rounded-xl bg-gradient-to-br from-champagne to-rose-gold-light flex items-center justify-center shadow-sm"
            >
              <Image className="w-8 h-8 text-primary/30" />
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground italic">
          * Fotos serão adicionadas em breve
        </p>
      </div>
    </section>
  );
};

export default PhotoPortfolioSection;
