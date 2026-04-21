import { useI18n } from "@/lib/i18n";

export function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    { n: "01", title: t("how.s1.title"), desc: t("how.s1.desc") },
    { n: "02", title: t("how.s2.title"), desc: t("how.s2.desc") },
    { n: "03", title: t("how.s3.title"), desc: t("how.s3.desc") },
  ];
  return (
    <section id="how" className="py-20 md:py-28 bg-card/40 border-y border-border/60">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center mb-14">
          {t("how.title")}
        </h2>
        <div className="grid md:grid-cols-3 gap-6 relative">
          {steps.map((s, i) => (
            <div key={s.n} className="relative bg-background border border-border rounded-2xl p-7 hover:shadow-elegant transition-shadow">
              <div className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-3">
                {s.n}
              </div>
              <h3 className="font-semibold text-xl mb-2">{s.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-border to-transparent" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
