import { Button } from "@/components/ui/button";
import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import heroImg from "@/assets/hero-rosca.jpg";

export function Hero() {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      <div className="container mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              {t("hero.badge")}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              {t("hero.title")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild variant="hero" size="xl" className="group">
                <Link to="/auth">
                  {t("hero.cta")}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <a href="#how">
                  <PlayCircle className="w-4 h-4" />
                  {t("hero.secondary")}
                </a>
              </Button>
            </div>
            <div className="flex items-center gap-3 pt-4">
              <div className="flex -space-x-2">
                {["bg-primary", "bg-gold", "bg-primary-glow", "bg-success"].map((c, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full ${c} border-2 border-background`} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">2,400+</span> Tanzanians saving together
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-primary blur-3xl opacity-20 rounded-full" />
            <div className="relative rounded-3xl overflow-hidden shadow-elegant border border-border/50 animate-float">
              <img
                src={heroImg}
                alt="Rotating savings flow with members in a circle"
                width={1536}
                height={1024}
                className="w-full h-auto"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 md:-left-8 bg-card border border-border rounded-2xl shadow-elegant p-4 max-w-[220px]">
              <div className="flex items-center gap-2 text-xs font-medium text-success mb-1">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                Cycle 3 · Month 4
              </div>
              <p className="text-2xl font-bold tracking-tight">1,200,000 <span className="text-sm font-medium text-muted-foreground">TZS</span></p>
              <p className="text-xs text-muted-foreground mt-0.5">Next payout · Asha M.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
