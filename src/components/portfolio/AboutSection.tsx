import { User } from "lucide-react";

const AboutSection = () => {
  return (
    <section id="sobre" className="px-6 py-16 bg-background">
      <div className="max-w-lg mx-auto space-y-8">
        {/* Section Header */}
        <div className="text-center space-y-2">
          <span className="text-sm font-medium tracking-[0.2em] text-accent uppercase">
            Sobre mim
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-foreground">
            Olá, eu sou a Helayne
          </h2>
        </div>

        {/* Photo Placeholder */}
        <div className="flex justify-center">
          <div className="w-48 h-48 rounded-full bg-gradient-to-br from-rose-gold-light to-champagne flex items-center justify-center border-4 border-white shadow-xl">
            <User className="w-20 h-20 text-primary/30" />
            <span className="sr-only">Foto de Helayne</span>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-4 text-center">
          <p className="text-foreground text-base leading-relaxed">
            Fundadora da <strong className="text-accent">Racun</strong>, uma agência que une marketing estratégico e produção audiovisual.
          </p>
          <p className="text-muted-foreground text-base leading-relaxed">
            Minha missão é ajudar empreendedoras e marcas a fortalecerem sua comunicação, se posicionarem com autoridade e conquistarem mais clientes através de conteúdo estratégico e visual de impacto.
          </p>
          <p className="text-muted-foreground text-base leading-relaxed">
            Acredito que toda marca merece ser vista, lembrada e desejada.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
