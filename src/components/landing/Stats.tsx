import { useI18n } from "@/lib/i18n";

export function Stats() {
  const { t } = useI18n();
  const items = [
    { v: "320+", l: t("stats.groups") },
    { v: "2,400", l: t("stats.members") },
    { v: "1,800", l: t("stats.cycles") },
    { v: "4.2B", l: t("stats.tzs") },
  ];
  return (
    <section className="border-y border-border/60 bg-card/40">
      <div className="container mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
        {items.map((i) => (
          <div key={i.l} className="text-center md:text-left">
            <div className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-primary bg-clip-text text-transparent">
              {i.v}
            </div>
            <div className="text-xs md:text-sm text-muted-foreground mt-1 font-medium">{i.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
