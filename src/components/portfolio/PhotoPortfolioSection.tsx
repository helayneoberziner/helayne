import food1 from "@/assets/portfolio/food-1.jpg";
import restaurant1 from "@/assets/portfolio/restaurant-1.jpg";
import couple1 from "@/assets/portfolio/couple-1.jpg";
import wedding1 from "@/assets/portfolio/wedding-1.jpg";
import table1 from "@/assets/portfolio/table-1.jpg";
import restaurant2 from "@/assets/portfolio/restaurant-2.jpg";
import { motion } from "framer-motion";
import { useScrollAnimation, fadeInUpVariants, staggerContainerVariants, staggerItemVariants } from "@/hooks/use-scroll-animation";
import OptimizedImage from "@/components/ui/optimized-image";

const photos = [
  { id: 1, src: food1, alt: "Fotografia gastronômica" },
  { id: 2, src: restaurant1, alt: "Fotografia de restaurante" },
  { id: 3, src: couple1, alt: "Ensaio de casal" },
  { id: 4, src: wedding1, alt: "Fotografia de casamento" },
  { id: 5, src: table1, alt: "Decoração de mesa" },
  { id: 6, src: restaurant2, alt: "Fachada de restaurante" },
];

const PhotoPortfolioSection = () => {
  const { ref, isInView } = useScrollAnimation();

  return (
    <section className="px-6 py-16 bg-background" ref={ref}>
      <motion.div 
        className="max-w-lg mx-auto space-y-8"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={staggerContainerVariants}
      >
        {/* Section Header */}
        <motion.div className="text-center space-y-2" variants={fadeInUpVariants} transition={{ duration: 0.6 }}>
          <span className="text-sm font-medium tracking-[0.2em] text-accent uppercase">
            Galeria
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-foreground">
            Nossas fotos
          </h2>
        </motion.div>

        {/* Photo Grid */}
        <motion.div 
          className="grid grid-cols-2 gap-3"
          variants={staggerContainerVariants}
        >
          {photos.map((photo) => (
            <motion.div
              key={photo.id}
              className="aspect-square rounded-xl overflow-hidden shadow-sm"
              variants={staggerItemVariants}
            >
              <OptimizedImage
                src={photo.src}
                alt={photo.alt}
                containerClassName="w-full h-full"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default PhotoPortfolioSection;
