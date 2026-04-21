import { Link, useNavigate } from "@tanstack/react-router";
import { Coins, LogOut, Moon, Sun, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { lang, setLang } = useI18n();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Coins className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">ROSCA</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline text-sm text-muted-foreground mr-2 truncate max-w-[160px]">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLang(lang === "en" ? "sw" : "en")}
              className="gap-1.5"
            >
              <Languages className="w-4 h-4" />
              <span className="uppercase text-xs">{lang}</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Theme">
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">{children}</main>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, session } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!session) {
    navigate({ to: "/auth" });
    return null;
  }

  return <>{children}</>;
}
