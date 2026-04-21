import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Stats } from "@/components/landing/Stats";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ROSCA — Digital Chama for Tanzania | Save Together" },
      {
        name: "description",
        content:
          "ROSCA digitizes your mchezo: track monthly contributions, automate payouts, and keep every cycle transparent. Built for Tanzanian savings groups.",
      },
      { property: "og:title", content: "ROSCA — Digital Chama for Tanzania" },
      { property: "og:description", content: "Save together. Grow together. Digital rotating savings made simple." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
