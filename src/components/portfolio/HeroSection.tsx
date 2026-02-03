import { Button } from "@/components/ui/button";
import { MessageCircle, Briefcase, FolderOpen } from "lucide-react";

const HeroSection = () => {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="min-h-screen flex flex-col justify-center px-6 py-12 bg-gradient-to-b from-champagne to-background">
      <div className="max-w-lg mx-auto text-center space-y-8">
        {/* Brand */}
        <div className="space-y-2 animate-fade-in">
          <span className="text-sm font-medium tracking-[0.3em] text-muted-foreground uppercase">
            Racun
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-foreground leading-tight">
            Marketing e audiovisual para empreendedoras que querem crescer com{" "}
            <span className="text-accent">estratégia</span>
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Ajudamos marcas a se posicionarem melhor, venderem mais e se comunicarem com profissionalismo.
        </p>

        {/* CTAs */}
        <div className="flex flex-col gap-3 pt-4 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <Button
            size="lg"
            className="w-full h-14 text-base font-medium gradient-rose text-white shadow-lg hover:opacity-90 transition-opacity"
            onClick={() => scrollToSection("servicos")}
          >
            <Briefcase className="w-5 h-5 mr-2" />
            Conhecer serviços
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full h-14 text-base font-medium border-2 border-primary/20 hover:bg-primary/5"
            onClick={() => scrollToSection("portfolio")}
          >
            <FolderOpen className="w-5 h-5 mr-2" />
            Ver trabalhos
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="w-full h-14 text-base font-medium"
            onClick={() => scrollToSection("contato")}
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Falar comigo
          </Button>
        </div>

        {/* Event Badge */}
        <div className="pt-6 animate-fade-in" style={{ animationDelay: "0.6s" }}>
          <div className="inline-block px-5 py-3 rounded-full bg-accent/10 border border-accent/20">
            <p className="text-sm text-accent font-medium">
              ✨ Se você está nesse evento, essa apresentação é pra você.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
