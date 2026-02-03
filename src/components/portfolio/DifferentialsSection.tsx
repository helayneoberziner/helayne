import { Users, Zap, BarChart3, Sparkles } from "lucide-react";

const differentials = [
  {
    icon: Users,
    title: "Atendimento próximo e humano",
    description: "Você não é só mais um cliente"
  },
  {
    icon: Zap,
    title: "Olhar estratégico + criativo",
    description: "Unimos dados e estética"
  },
  {
    icon: BarChart3,
    title: "Marketing com foco em resultado",
    description: "Cada ação pensada para converter"
  },
  {
    icon: Sparkles,
    title: "Conteúdo com estética e propósito",
    description: "Visual que encanta e vende"
  }
];

const DifferentialsSection = () => {
  return (
    <section className="px-6 py-16 bg-background">
      <div className="max-w-lg mx-auto space-y-8">
        {/* Section Header */}
        <div className="text-center space-y-2">
          <span className="text-sm font-medium tracking-[0.2em] text-accent uppercase">
            Diferenciais
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-foreground">
            Por que a Racun?
          </h2>
        </div>

        {/* Differentials Grid */}
        <div className="grid grid-cols-2 gap-4">
          {differentials.map((item, index) => (
            <div
              key={index}
              className="p-5 rounded-2xl bg-gradient-to-br from-champagne to-soft-cream text-center space-y-3"
            >
              <div className="w-12 h-12 mx-auto rounded-full gradient-rose flex items-center justify-center">
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-display text-sm font-medium text-foreground leading-tight">
                {item.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DifferentialsSection;
