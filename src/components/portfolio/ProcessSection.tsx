import { Search, Lightbulb, Rocket } from "lucide-react";
import { motion } from "framer-motion";
import { useScrollAnimation, fadeInUpVariants, staggerContainerVariants, staggerItemVariants } from "@/hooks/use-scroll-animation";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Entendemos seu negócio",
    description: "Conhecemos sua marca, objetivos e público"
  },
  {
    number: "02",
    icon: Lightbulb,
    title: "Criamos a estratégia certa",
    description: "Planejamento personalizado para seu crescimento"
  },
  {
    number: "03",
    icon: Rocket,
    title: "Executamos e acompanhamos",
    description: "Entregamos resultados com suporte contínuo"
  }
];

const ProcessSection = () => {
  const { ref, isInView } = useScrollAnimation();

  return (
    <section className="px-6 py-16 bg-background" ref={ref}>
      <motion.div 
        className="max-w-lg mx-auto space-y-10"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={staggerContainerVariants}
      >
        {/* Section Header */}
        <motion.div className="text-center space-y-2" variants={fadeInUpVariants} transition={{ duration: 0.6 }}>
          <span className="text-sm font-medium tracking-[0.2em] text-accent uppercase">
            Processo
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-foreground">
            Como funciona
          </h2>
        </motion.div>

        {/* Steps */}
        <motion.div className="space-y-6" variants={staggerContainerVariants}>
          {steps.map((step, index) => (
            <motion.div key={index} className="flex items-start gap-4" variants={staggerItemVariants}>
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl gradient-rose flex items-center justify-center shadow-lg">
                  <step.icon className="w-6 h-6 text-white" />
                </div>
                {index < steps.length - 1 && (
                  <div className="absolute left-1/2 top-full w-[2px] h-6 bg-border -translate-x-1/2" />
                )}
              </div>
              <div className="pt-2">
                <span className="text-xs font-semibold text-accent">{step.number}</span>
                <h3 className="font-display text-lg font-medium text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default ProcessSection;
