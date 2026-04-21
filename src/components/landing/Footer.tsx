import { Coins } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Coins className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">ROSCA</span>
          <span className="text-muted-foreground text-sm hidden sm:inline">· {t("footer.tag")}</span>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} ROSCA. All rights reserved.</p>
      </div>
    </footer>
  );
}
