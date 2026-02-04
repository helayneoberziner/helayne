import food1 from "@/assets/portfolio/food-1.jpg";
import restaurant1 from "@/assets/portfolio/restaurant-1.jpg";
import couple1 from "@/assets/portfolio/couple-1.jpg";
import wedding1 from "@/assets/portfolio/wedding-1.jpg";
import table1 from "@/assets/portfolio/table-1.jpg";
import restaurant2 from "@/assets/portfolio/restaurant-2.jpg";

const photos = [
  { id: 1, src: food1, alt: "Fotografia gastronômica" },
  { id: 2, src: restaurant1, alt: "Fotografia de restaurante" },
  { id: 3, src: couple1, alt: "Ensaio de casal" },
  { id: 4, src: wedding1, alt: "Fotografia de casamento" },
  { id: 5, src: table1, alt: "Decoração de mesa" },
  { id: 6, src: restaurant2, alt: "Fachada de restaurante" },
];

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
              key={photo.id}
              className="aspect-square rounded-xl overflow-hidden shadow-sm"
            >
              <img
                src={photo.src}
                alt={photo.alt}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PhotoPortfolioSection;
