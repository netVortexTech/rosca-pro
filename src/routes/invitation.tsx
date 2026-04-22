import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Coins,
  Loader2,
  Search,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

type Search = { code?: string };

export const Route = createFileRoute("/invitation")({
  head: () => ({ meta: [{ title: "Join a chama — ROSCA" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    code: typeof s.code === "string" ? s.code.toUpperCase() : undefined,
  }),
  component: InvitationPage,
});

type GroupPreview = {
  id: string;
  name: string;
  description: string | null;
  contribution_amount: number;
  currency: string;
  member_count: number;
  current_cycle: number;
  invite_code: string;
};

function InvitationPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/invitation" });
  const { user, loading: authLoading } = useAuth();

  const [codeInput, setCodeInput] = useState(search.code ?? "");
  const [code, setCode] = useState<string | undefined>(search.code);
  const [group, setGroup] = useState<GroupPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setNotFound(false);
    (async () => {
      const { data, error } = await supabase.rpc("get_group_by_invite_code", { _code: code });
      if (error) {
        toast.error(error.message);
      }
      const row = (data?.[0] as GroupPreview | undefined) ?? null;
      setGroup(row);
      if (!row) setNotFound(true);
      setLoading(false);
    })();
  }, [code]);

  const lookup = (e: React.FormEvent) => {
    e.preventDefault();
    const c = codeInput.trim().toUpperCase();
    if (!c) return;
    setCode(c);
    navigate({ to: "/invitation", search: { code: c } });
  };

  const claim = async () => {
    if (!code) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc("claim_invite_by_code", { _code: code });
      if (error) throw error;
      toast.success("You're in! Welcome to the chama.");
      navigate({ to: "/groups/$groupId", params: { groupId: data as string } });
    } catch (err: any) {
      toast.error(err.message ?? "Could not claim invite");
    } finally {
      setClaiming(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-lg mx-auto">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Coins className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl">ROSCA</span>
        </Link>

        {/* Code lookup form */}
        {!code && (
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
            <h1 className="text-2xl font-bold tracking-tight">Join a chama</h1>
            <p className="text-muted-foreground mt-1 mb-6">
              Enter the 6-character invite code your chama admin shared with you.
            </p>
            <form onSubmit={lookup} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="code">Invite code</Label>
                <Input
                  id="code"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. CHAMA4"
                  className="font-mono tracking-widest text-lg uppercase"
                  maxLength={10}
                  required
                />
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full">
                <Search className="w-4 h-4" /> Find my chama
              </Button>
            </form>
          </div>
        )}

        {/* Loading state */}
        {code && loading && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-3">Looking up invite…</p>
          </div>
        )}

        {/* Not found */}
        {code && !loading && notFound && (
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 text-center">
            <h1 className="text-xl font-bold">Invite not found</h1>
            <p className="text-muted-foreground mt-2 mb-6">
              No chama matches the code <span className="font-mono">{code}</span>. Check with your
              admin and try again.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setCode(undefined);
                setGroup(null);
                setCodeInput("");
                navigate({ to: "/invitation", search: {} });
              }}
            >
              Try another code
            </Button>
          </div>
        )}

        {/* Group preview */}
        {group && (
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              You're invited to join
            </p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">{group.name}</h1>
            {group.description && (
              <p className="text-muted-foreground mt-2">{group.description}</p>
            )}

            <div className="grid grid-cols-3 gap-2 mt-5 text-sm">
              <div className="bg-muted rounded-lg p-3">
                <Wallet className="w-4 h-4 text-primary mb-1" />
                <p className="font-semibold">{fmt(group.contribution_amount)}</p>
                <p className="text-xs text-muted-foreground">{group.currency}/mo</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <Users className="w-4 h-4 text-primary mb-1" />
                <p className="font-semibold">{group.member_count}</p>
                <p className="text-xs text-muted-foreground">members</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <Calendar className="w-4 h-4 text-primary mb-1" />
                <p className="font-semibold">{group.current_cycle}</p>
                <p className="text-xs text-muted-foreground">cycle</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {authLoading ? (
                <p className="text-sm text-muted-foreground">Checking your session…</p>
              ) : !user ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Create an account or sign in with the phone number your admin invited. We'll
                    automatically connect you to this chama.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button asChild variant="hero" size="lg">
                      <Link to="/auth" search={{ mode: "signup", code: group.invite_code }}>
                        Create account
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <Link to="/auth" search={{ mode: "signin", code: group.invite_code }}>
                        Sign in
                      </Link>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Signed in. Tap below to claim your spot — we'll match your phone against the
                    invite list.
                  </p>
                  <Button
                    onClick={claim}
                    variant="hero"
                    size="lg"
                    className="w-full"
                    disabled={claiming}
                  >
                    {claiming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Join {group.name}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Not invited yet? Share your phone number with the chama admin.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
