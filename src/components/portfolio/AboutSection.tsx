import helaynePhoto from "@/assets/helayne-profile.jpeg";
import { motion } from "framer-motion";
import { useScrollAnimation, fadeInUpVariants, scaleInVariants } from "@/hooks/use-scroll-animation";
import OptimizedImage from "@/components/ui/optimized-image";

const AboutSection = () => {
  const { ref, isInView } = useScrollAnimation();

  return (
    <section id="sobre" className="px-6 py-16 bg-background" ref={ref}>
      <motion.div 
        className="max-w-lg mx-auto space-y-8"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
        }}
      >
        {/* Section Header */}
        <motion.div className="text-center space-y-2" variants={fadeInUpVariants} transition={{ duration: 0.6 }}>
          <span className="text-sm font-medium tracking-[0.2em] text-accent uppercase">
            Sobre mim
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-foreground">
            Olá, eu sou a Helayne
          </h2>
        </motion.div>

        {/* Photo */}
        <motion.div className="flex justify-center" variants={scaleInVariants} transition={{ duration: 0.6 }}>
          <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-xl">
            <OptimizedImage 
              src={helaynePhoto} 
              alt="Foto de Helayne, fundadora da Racun"
              containerClassName="w-full h-full"
              className="w-full h-full object-cover"
              priority={true}
            />
          </div>
        </motion.div>

        {/* Bio */}
        <motion.div className="space-y-4 text-center" variants={fadeInUpVariants} transition={{ duration: 0.6 }}>
          <p className="text-foreground text-base leading-relaxed">
            Fundadora da <strong className="text-accent">Racun</strong>, uma agência que une marketing estratégico e produção audiovisual.
          </p>
          <p className="text-muted-foreground text-base leading-relaxed">
            Minha missão é ajudar empreendedoras e marcas a fortalecerem sua comunicação, se posicionarem com autoridade e conquistarem mais clientes através de conteúdo estratégico e visual de impacto.
          </p>
          <p className="text-muted-foreground text-base leading-relaxed">
            Acredito que toda marca merece ser vista, lembrada e desejada.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default AboutSection;
