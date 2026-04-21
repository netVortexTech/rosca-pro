import { Link } from "@tanstack/react-router";
import { Moon, Sun, Languages, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export function Header() {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
            <Coins className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">ROSCA</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">{t("nav.features")}</a>
          <a href="#how" className="hover:text-foreground transition-colors">{t("nav.how")}</a>
          <a href="#faq" className="hover:text-foreground transition-colors">{t("nav.faq")}</a>
        </nav>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang(lang === "en" ? "sw" : "en")}
            className="gap-1.5 font-medium"
          >
            <Languages className="w-4 h-4" />
            <span className="uppercase text-xs">{lang}</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/auth">{t("nav.signin")}</Link>
          </Button>
          <Button asChild size="sm" variant="hero">
            <Link to="/auth">{t("nav.start")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
