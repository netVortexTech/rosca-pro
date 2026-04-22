import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { AppShell, RequireAuth } from "@/components/app/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Trash2,
  UserPlus,
  Users,
  Wallet,
  Calendar,
  MessageCircle,
  Crown,
  Mail,
  Loader2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { CycleTracker } from "@/components/app/CycleTracker";
import { InviteLink } from "@/components/app/InviteLink";

export const Route = createFileRoute("/groups/$groupId")({
  head: () => ({ meta: [{ title: "Chama — ROSCA" }] }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <GroupDetail />
      </AppShell>
    </RequireAuth>
  ),
});

type Group = {
  id: string;
  name: string;
  description: string | null;
  contribution_amount: number;
  currency: string;
  member_count: number;
  current_cycle: number;
  start_month: string;
  whatsapp_link: string | null;
  status: string;
  created_by: string;
};

type Member = {
  id: string;
  user_id: string | null;
  invited_email: string;
  invited_name: string | null;
  position: number;
  role: "admin" | "member";
  status: "pending" | "active" | "removed";
};

function GroupDetail() {
  const { user } = useAuth();
  const { groupId } = Route.useParams();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [adding, setAdding] = useState(false);

  const isAdmin = !!members.find((m) => m.user_id === user?.id && m.role === "admin");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: g }, { data: m }] = await Promise.all([
      supabase.from("groups").select("*").eq("id", groupId).single(),
      supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId)
        .neq("status", "removed")
        .order("position"),
    ]);
    setGroup(g as Group | null);
    setMembers((m ?? []) as Member[]);
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;
    if (members.length >= group.member_count) {
      toast.error(`This chama is set for ${group.member_count} members.`);
      return;
    }
    setAdding(true);
    try {
      const nextPos = (members.at(-1)?.position ?? 0) + 1;
      const { error } = await supabase.from("group_members").insert({
        group_id: group.id,
        invited_email: inviteEmail.trim().toLowerCase(),
        invited_name: inviteName.trim() || null,
        position: nextPos,
        role: "member",
        status: "pending",
      });
      if (error) throw error;
      toast.success("Invite added. They'll join when they sign up with this email.");
      setInviteEmail("");
      setInviteName("");
      await load();
    } catch (err: any) {
      toast.error(err.message ?? "Could not add member");
    } finally {
      setAdding(false);
    }
  };

  const removeMember = async (m: Member) => {
    if (m.user_id === group?.created_by) {
      toast.error("You can't remove the group creator.");
      return;
    }
    if (!confirm(`Remove ${m.invited_name ?? m.invited_email}?`)) return;
    const { error } = await supabase.from("group_members").delete().eq("id", m.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Member removed");
      load();
    }
  };

  const swapPosition = async (idx: number, dir: -1 | 1) => {
    const a = members[idx];
    const b = members[idx + dir];
    if (!a || !b) return;
    // Two-step swap to avoid unique constraint collision
    const tempPos = -Math.floor(Math.random() * 1_000_000) - 1;
    const e1 = await supabase.from("group_members").update({ position: tempPos }).eq("id", a.id);
    if (e1.error) return toast.error(e1.error.message);
    const e2 = await supabase.from("group_members").update({ position: a.position }).eq("id", b.id);
    if (e2.error) return toast.error(e2.error.message);
    const e3 = await supabase.from("group_members").update({ position: b.position }).eq("id", a.id);
    if (e3.error) return toast.error(e3.error.message);
    load();
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading chama…</p>;
  }
  if (!group) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Chama not found or you don't have access.</p>
        <Button asChild variant="hero">
          <Link to="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    );
  }

  const filledSlots = members.length;
  const remaining = group.member_count - filledSlots;
  const upcomingRecipient = members.find((m) => m.position === group.current_cycle) ?? members[0];

  return (
    <div className="max-w-5xl mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/dashboard">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{group.name}</h1>
          {group.description && <p className="text-muted-foreground mt-1">{group.description}</p>}
          <div className="flex flex-wrap gap-3 mt-3 text-sm">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
              <Wallet className="w-3.5 h-3.5" /> {fmt(group.contribution_amount)} {group.currency}/mo
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-foreground">
              <Users className="w-3.5 h-3.5" /> {group.member_count} members
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-foreground">
              <Calendar className="w-3.5 h-3.5" /> Cycle {group.current_cycle}
            </span>
          </div>
        </div>
        {group.whatsapp_link && (
          <Button asChild variant="gold">
            <a href={group.whatsapp_link} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-4 h-4" /> WhatsApp group
            </a>
          </Button>
        )}
      </div>

      {/* Upcoming payout card */}
      <div className="bg-gradient-to-br from-primary/10 via-card to-card border border-primary/30 rounded-2xl p-5 mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Next payout recipient</p>
          <p className="font-semibold text-lg mt-0.5">
            {upcomingRecipient?.invited_name ?? upcomingRecipient?.invited_email ?? "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            Position {upcomingRecipient?.position ?? "—"} · Pool {fmt(group.contribution_amount * group.member_count)} {group.currency}
          </p>
        </div>
      </div>

      {/* Members list */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Members & payout order</h2>
          <span className="text-sm text-muted-foreground">
            {filledSlots} of {group.member_count} filled
          </span>
        </div>

        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {members.map((m, i) => (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center shrink-0">
                  {m.position}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">
                      {m.invited_name ?? m.invited_email}
                    </p>
                    {m.role === "admin" && (
                      <span className="inline-flex items-center gap-1 text-xs text-gold-foreground bg-gold/20 px-1.5 py-0.5 rounded">
                        <Crown className="w-3 h-3" /> admin
                      </span>
                    )}
                    {m.status === "pending" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        <Clock className="w-3 h-3" /> pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-success bg-success/10 px-1.5 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" /> active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{m.invited_email}</p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={i === 0}
                      onClick={() => swapPosition(i, -1)}
                      aria-label="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={i === members.length - 1}
                      onClick={() => swapPosition(i, 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMember(m)}
                      aria-label="Remove"
                      disabled={m.user_id === group.created_by}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Cycle tracking */}
      <div className="mb-6">
        <CycleTracker
          groupId={group.id}
          isAdmin={isAdmin}
          members={members.map((m) => ({
            id: m.id,
            invited_email: m.invited_email,
            invited_name: m.invited_name,
            position: m.position,
            status: m.status,
          }))}
          contributionAmount={group.contribution_amount}
          currency={group.currency}
          memberCount={group.member_count}
          currentCycleNumber={group.current_cycle}
          startMonth={group.start_month}
        />
      </div>

      {/* Invite link */}
      {isAdmin && <InviteLink groupId={group.id} />}

      {/* Invite form */}
      {isAdmin && remaining > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
            <UserPlus className="w-5 h-5" /> Invite a member
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Enter their email. They'll join automatically when they sign up with the same email.
            ({remaining} slot{remaining === 1 ? "" : "s"} remaining)
          </p>
          <form onSubmit={addMember} className="grid sm:grid-cols-[1fr_1fr_auto] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="iemail" className="text-xs">Email</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="iemail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="pl-9"
                  placeholder="member@example.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iname" className="text-xs">Name (optional)</Label>
              <Input
                id="iname"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="hero" disabled={adding} className="w-full sm:w-auto">
                {adding && <Loader2 className="w-4 h-4 animate-spin" />}
                Add
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
