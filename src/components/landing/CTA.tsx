import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function CTA() {
  const { t } = useI18n();
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-10 md:p-16 text-center shadow-elegant">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-gold blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-primary-glow blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-primary-foreground max-w-2xl mx-auto leading-tight">
              {t("cta.title")}
            </h2>
            <p className="text-primary-foreground/80 mt-4 text-lg max-w-xl mx-auto">
              {t("cta.subtitle")}
            </p>
            <Button asChild variant="gold" size="xl" className="mt-8 group">
              <Link to="/auth">
                {t("cta.button")}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
