import { Button } from "@/components/ui/button";
import { MessageCircle, Briefcase, FolderOpen } from "lucide-react";
import { motion } from "framer-motion";

const HeroSection = () => {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="min-h-screen flex flex-col justify-center px-6 py-12 bg-gradient-to-b from-champagne to-background">
      <motion.div 
        className="max-w-lg mx-auto text-center space-y-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Brand */}
        <motion.div 
          className="space-y-2"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <span className="text-sm font-medium tracking-[0.3em] text-muted-foreground uppercase">
            Racun
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-foreground leading-tight">
            Marketing e audiovisual para empreendedoras que querem crescer com{" "}
            <span className="text-accent">estratégia</span>
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p 
          className="text-muted-foreground text-base sm:text-lg leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          Ajudamos marcas a se posicionarem melhor, venderem mais e se comunicarem com profissionalismo.
        </motion.p>

        {/* CTAs */}
        <motion.div 
          className="flex flex-col gap-3 pt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
            size="lg"
            className="w-full h-14 text-base font-medium gradient-rose text-white shadow-lg hover:opacity-90 transition-opacity"
            onClick={() => scrollToSection("servicos")}
          >
            <Briefcase className="w-5 h-5 mr-2" />
            Conhecer serviços
          </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
            size="lg"
            variant="outline"
            className="w-full h-14 text-base font-medium border-2 border-primary/20 hover:bg-primary/5"
            onClick={() => scrollToSection("portfolio")}
          >
            <FolderOpen className="w-5 h-5 mr-2" />
            Ver trabalhos
          </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
            size="lg"
            variant="secondary"
            className="w-full h-14 text-base font-medium"
            onClick={() => scrollToSection("contato")}
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Falar comigo
          </Button>
          </motion.div>
        </motion.div>

        {/* Event Badge */}
        <motion.div 
          className="pt-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <motion.div 
            className="inline-block px-5 py-3 rounded-full bg-accent/10 border border-accent/20"
            whileHover={{ scale: 1.05 }}
          >
            <p className="text-sm text-accent font-medium">
              ✨ Se você está nesse evento, essa apresentação é pra você.
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
