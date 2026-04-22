import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, RequireAuth } from "@/components/app/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Coins, Users, Wallet, Calendar, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/join/$groupId")({
  head: () => ({ meta: [{ title: "Join chama — ROSCA" }] }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <JoinGroup />
      </AppShell>
    </RequireAuth>
  ),
});

type GroupPreview = {
  id: string;
  name: string;
  description: string | null;
  contribution_amount: number;
  currency: string;
  member_count: number;
  current_cycle: number;
};

function JoinGroup() {
  const { user } = useAuth();
  const { groupId } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<GroupPreview | null>(null);
  const [memberStatus, setMemberStatus] = useState<"none" | "pending" | "active">("none");
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);

      // Try to read group via RLS (works if already a member)
      const { data: g } = await supabase
        .from("groups")
        .select("id,name,description,contribution_amount,currency,member_count,current_cycle")
        .eq("id", groupId)
        .maybeSingle();

      // Check if user has any row for this group (active OR pending by email)
      const { data: mine } = await supabase
        .from("group_members")
        .select("id,status,user_id,invited_email")
        .eq("group_id", groupId)
        .or(`user_id.eq.${user.id},invited_email.eq.${user.email?.toLowerCase()}`)
        .maybeSingle();

      if (mine?.status === "active") setMemberStatus("active");
      else if (mine?.status === "pending") setMemberStatus("pending");
      else setMemberStatus("none");

      setGroup((g as GroupPreview) ?? null);
      setLoading(false);
    })();
  }, [user, groupId]);

  const claimInvite = async () => {
    if (!user) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase
        .from("group_members")
        .update({ user_id: user.id, status: "active", joined_at: new Date().toISOString() })
        .eq("group_id", groupId)
        .eq("invited_email", user.email!.toLowerCase())
        .eq("status", "pending")
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error("No pending invite found for your email. Ask the admin to add you.");
        return;
      }
      toast.success("You're in! Welcome to the chama.");
      navigate({ to: "/groups/$groupId", params: { groupId } });
    } catch (err: any) {
      toast.error(err.message ?? "Could not claim invite");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading invite…</p>;

  const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

  if (memberStatus === "active") {
    return (
      <div className="max-w-md mx-auto text-center bg-card border border-border rounded-2xl p-8">
        <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
        <h1 className="text-2xl font-bold">You're already a member</h1>
        <p className="text-muted-foreground mt-1 mb-6">Head over to the group to see contributions and payouts.</p>
        <Button asChild variant="hero" size="lg">
          <Link to="/groups/$groupId" params={{ groupId }}>
            Open chama <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow mb-4">
          <Coins className="w-6 h-6 text-primary-foreground" />
        </div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">You're invited to join</p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">
          {group?.name ?? "This chama"}
        </h1>
        {group?.description && <p className="text-muted-foreground mt-2">{group.description}</p>}

        {group && (
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
        )}

        <div className="mt-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user?.email}</span>.
            {memberStatus === "pending"
              ? " You have a pending invite — claim it to join."
              : " If the admin invited this email, you can claim your spot now."}
          </p>
          <Button onClick={claimInvite} variant="hero" size="lg" className="w-full" disabled={claiming}>
            {claiming && <Loader2 className="w-4 h-4 animate-spin" />}
            Claim my invite
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Not invited yet? Share your email with the chama admin so they can add you.
          </p>
        </div>
      </div>
    </div>
  );
}
