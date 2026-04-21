import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, RequireAuth } from "@/components/app/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Users, Calendar, Wallet, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ROSCA" }] }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <Dashboard />
      </AppShell>
    </RequireAuth>
  ),
});

type GroupRow = {
  id: string;
  name: string;
  contribution_amount: number;
  currency: string;
  member_count: number;
  current_cycle: number;
  status: string;
  role: string;
};

function Dashboard() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("role, status, groups(id,name,contribution_amount,currency,member_count,current_cycle,status)")
        .eq("user_id", user.id)
        .eq("status", "active");
      if (!error && data) {
        setGroups(
          data
            .filter((r: any) => r.groups)
            .map((r: any) => ({ ...r.groups, role: r.role })),
        );
      }
      setLoading(false);
    })();
  }, [user]);

  const fmt = (n: number, cur: string) =>
    new Intl.NumberFormat("en-US").format(n) + " " + cur;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">My Chamas</h1>
          <p className="text-muted-foreground mt-1">Your savings groups and cycles.</p>
        </div>
        <Button asChild variant="hero" size="lg">
          <Link to="/groups/new">
            <Plus className="w-4 h-4" /> New chama
          </Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading your groups…</p>
      ) : groups.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No chamas yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Start a savings group, set the contribution amount, and invite members by email.
          </p>
          <Button asChild variant="hero" size="lg">
            <Link to="/groups/new">
              <Plus className="w-4 h-4" /> Create your first chama
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((g) => (
            <Link
              key={g.id}
              to="/groups/$groupId"
              params={{ groupId: g.id }}
              className="group bg-card border border-border rounded-2xl p-6 hover:border-primary/40 hover:shadow-elegant transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{g.name}</h3>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mt-0.5">
                    {g.role} · {g.status}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Wallet className="w-4 h-4" />
                  <span>{fmt(g.contribution_amount, g.currency)} / month</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{g.member_count} members</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Cycle {g.current_cycle}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
