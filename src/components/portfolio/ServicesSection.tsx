import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useScrollAnimation, fadeInUpVariants, staggerContainerVariants, staggerItemVariants } from "@/hooks/use-scroll-animation";
import { 
  Target, 
  TrendingUp, 
  PenTool, 
  Award,
  Video, 
  Camera, 
  Film, 
  Calendar 
} from "lucide-react";

const marketingServices = [
  {
    icon: Target,
    title: "Gestão de redes sociais",
    description: "Com foco em posicionamento e vendas"
  },
  {
    icon: TrendingUp,
    title: "Tráfego pago e campanhas",
    description: "Anúncios que geram resultado"
  },
  {
    icon: PenTool,
    title: "Conteúdo estratégico",
    description: "Planejamento que engaja e converte"
  },
  {
    icon: Award,
    title: "Posicionamento de marca",
    description: "Autoridade no seu mercado"
  }
];

const audiovisualServices = [
  {
    icon: Film,
    title: "Vídeos institucionais",
    description: "A história da sua marca contada com impacto"
  },
  {
    icon: Video,
    title: "Vídeos para redes e anúncios",
    description: "Conteúdo que para o scroll"
  },
  {
    icon: Calendar,
    title: "Cobertura de eventos",
    description: "Registrando momentos importantes"
  },
  {
    icon: Camera,
    title: "Fotografia profissional",
    description: "Imagens que vendem sua marca"
  }
];

const ServicesSection = () => {
  const { ref, isInView } = useScrollAnimation();

  return (
    <section id="servicos" className="px-6 py-16 bg-soft-cream" ref={ref}>
      <motion.div 
        className="max-w-lg mx-auto space-y-12"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={staggerContainerVariants}
      >
        {/* Section Header */}
        <motion.div className="text-center space-y-2" variants={fadeInUpVariants} transition={{ duration: 0.6 }}>
          <span className="text-sm font-medium tracking-[0.2em] text-accent uppercase">
            Serviços
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-foreground">
            O que fazemos na Racun
          </h2>
        </motion.div>

        {/* Marketing Block */}
        <motion.div className="space-y-4" variants={fadeInUpVariants} transition={{ duration: 0.5 }}>
          <h3 className="font-display text-xl font-medium text-foreground text-center flex items-center justify-center gap-2">
            <span className="w-8 h-[2px] bg-accent"></span>
            Marketing Estratégico
            <span className="w-8 h-[2px] bg-accent"></span>
          </h3>
          <motion.div className="grid gap-3" variants={staggerContainerVariants}>
            {marketingServices.map((service, index) => (
              <motion.div key={index} variants={staggerItemVariants}>
              <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full gradient-rose flex items-center justify-center flex-shrink-0">
                    <service.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{service.title}</h4>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Audiovisual Block */}
        <motion.div className="space-y-4" variants={fadeInUpVariants} transition={{ duration: 0.5 }}>
          <h3 className="font-display text-xl font-medium text-foreground text-center flex items-center justify-center gap-2">
            <span className="w-8 h-[2px] bg-primary"></span>
            Produção Audiovisual
            <span className="w-8 h-[2px] bg-primary"></span>
          </h3>
          <motion.div className="grid gap-3" variants={staggerContainerVariants}>
            {audiovisualServices.map((service, index) => (
              <motion.div key={index} variants={staggerItemVariants}>
              <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <service.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{service.title}</h4>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default ServicesSection;
