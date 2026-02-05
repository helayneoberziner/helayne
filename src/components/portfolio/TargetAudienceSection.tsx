import { Heart, Store, TrendingUp, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { useScrollAnimation, fadeInUpVariants, staggerContainerVariants, staggerItemVariants } from "@/hooks/use-scroll-animation";

const audiences = [
  {
    icon: Heart,
    label: "Empreendedoras"
  },
  {
    icon: Store,
    label: "Negócios locais"
  },
  {
    icon: TrendingUp,
    label: "Marcas que querem crescer"
  },
  {
    icon: Building2,
    label: "Empresas que buscam posicionamento profissional"
  }
];

const TargetAudienceSection = () => {
  const { ref, isInView } = useScrollAnimation();

  return (
    <section className="px-6 py-16 bg-soft-cream" ref={ref}>
      <motion.div 
        className="max-w-lg mx-auto space-y-8"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={staggerContainerVariants}
      >
        {/* Section Header */}
        <motion.div className="text-center space-y-2" variants={fadeInUpVariants} transition={{ duration: 0.6 }}>
          <span className="text-sm font-medium tracking-[0.2em] text-accent uppercase">
            Para quem
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-foreground">
            Meu trabalho é para você
          </h2>
        </motion.div>

        {/* Audience List */}
        <motion.div className="space-y-3" variants={staggerContainerVariants}>
          {audiences.map((audience, index) => (
            <motion.div
              key={index}
              className="flex items-center gap-4 p-4 rounded-xl bg-white/80 shadow-sm"
              variants={staggerItemVariants}
            >
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <audience.icon className="w-5 h-5 text-accent" />
              </div>
              <span className="font-medium text-foreground">{audience.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default TargetAudienceSection;
