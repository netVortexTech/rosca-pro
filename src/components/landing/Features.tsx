import { useI18n } from "@/lib/i18n";
import { RotateCw, Bell, Eye, Users, MessageCircle, FileBarChart } from "lucide-react";

export function Features() {
  const { t } = useI18n();
  const features = [
    { icon: RotateCw, title: t("f1.title"), desc: t("f1.desc"), color: "text-primary", bg: "bg-primary/10" },
    { icon: Bell, title: t("f2.title"), desc: t("f2.desc"), color: "text-gold-foreground", bg: "bg-gold/20" },
    { icon: Eye, title: t("f3.title"), desc: t("f3.desc"), color: "text-success", bg: "bg-success/10" },
    { icon: Users, title: t("f4.title"), desc: t("f4.desc"), color: "text-primary", bg: "bg-primary/10" },
    { icon: MessageCircle, title: t("f5.title"), desc: t("f5.desc"), color: "text-success", bg: "bg-success/10" },
    { icon: FileBarChart, title: t("f6.title"), desc: t("f6.desc"), color: "text-gold-foreground", bg: "bg-gold/20" },
  ];

  return (
    <section id="features" className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">{t("features.title")}</h2>
          <p className="text-muted-foreground mt-4 text-lg">{t("features.subtitle")}</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative bg-card border border-border rounded-2xl p-6 hover:border-primary/40 hover:shadow-elegant transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <f.icon className={`w-6 h-6 ${f.color}`} />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
