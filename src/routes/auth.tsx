import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins, Loader2, Phone } from "lucide-react";
import { toast } from "sonner";
import { normalizePhone, isValidPhone, phoneToSyntheticEmail } from "@/lib/phone";

type AuthSearch = { redirect?: string; code?: string; mode?: "signin" | "signup" };

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — ROSCA" }] }),
  validateSearch: (s: Record<string, unknown>): AuthSearch => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    code: typeof s.code === "string" ? s.code : undefined,
    mode: s.mode === "signup" || s.mode === "signin" ? s.mode : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const redirectTarget =
    search.redirect ?? (search.code ? `/invitation?code=${search.code}` : "/dashboard");

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: redirectTarget });
    }
  }, [loading, session, navigate, redirectTarget]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPhone(phone)) {
      toast.error("Enter a valid phone number, e.g. 0712345678");
      return;
    }
    setBusy(true);
    try {
      const normPhone = normalizePhone(phone);
      const loginEmail = email.trim() ? email.trim().toLowerCase() : phoneToSyntheticEmail(normPhone);

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: loginEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${redirectTarget}`,
            data: { display_name: name, phone: normPhone },
          },
        });
        if (error) throw error;
        toast.success("Account created. You're in!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (error) throw error;
        toast.success("Welcome back");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Coins className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl">ROSCA</span>
        </Link>

        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-elegant">
          <h1 className="text-2xl font-bold mb-1">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "signin"
              ? "Sign in with your phone number."
              : search.code
                ? "Finish creating your account to join the chama you were invited to."
                : "Start a chama or join one you've been invited to."}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  className="pl-9"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Use the number your chama admin invited.
              </p>
            </div>
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="for recovery only"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" variant="hero" className="w-full" size="lg" disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to ROSCA?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="text-primary hover:underline font-medium"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Create account" : "Sign in"}
            </button>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6">
          By continuing you agree to the transparent, member-first principles of ROSCA.
        </p>
      </div>
    </div>
  );
}
