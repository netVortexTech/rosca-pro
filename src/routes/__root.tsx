import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Rosca | Wekeni pamoja_Kueni pamoja." },
      { name: "description", content: "Mchezo ni wako. Endesha kikundi cha mchezo kwa urahisi kiganjani mwako." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Rosca | Wekeni pamoja_Kueni pamoja." },
      { property: "og:description", content: "Mchezo ni wako. Endesha kikundi cha mchezo kwa urahisi kiganjani mwako." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Rosca | Wekeni pamoja_Kueni pamoja." },
      { name: "twitter:description", content: "Mchezo ni wako. Endesha kikundi cha mchezo kwa urahisi kiganjani mwako." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c53ef490-a89a-49ec-ba9f-d84e22422311/id-preview-b6d1442a--eb3ebbab-50f1-482a-a248-9864aaa659aa.lovable.app-1776798424269.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c53ef490-a89a-49ec-ba9f-d84e22422311/id-preview-b6d1442a--eb3ebbab-50f1-482a-a248-9864aaa659aa.lovable.app-1776798424269.png" },
      { name: "theme-color", content: "#0d9488" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Rosca" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

function RootComponent() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <Outlet />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
