import { Heart, Store, TrendingUp, Building2 } from "lucide-react";

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
  return (
    <section className="px-6 py-16 bg-soft-cream">
      <div className="max-w-lg mx-auto space-y-8">
        {/* Section Header */}
        <div className="text-center space-y-2">
          <span className="text-sm font-medium tracking-[0.2em] text-accent uppercase">
            Para quem
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-foreground">
            Meu trabalho é para você
          </h2>
        </div>

        {/* Audience List */}
        <div className="space-y-3">
          {audiences.map((audience, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-4 rounded-xl bg-white/80 shadow-sm"
            >
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <audience.icon className="w-5 h-5 text-accent" />
              </div>
              <span className="font-medium text-foreground">{audience.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TargetAudienceSection;
