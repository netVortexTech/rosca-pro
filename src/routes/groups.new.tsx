import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, RequireAuth } from "@/components/app/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/groups/new")({
  head: () => ({ meta: [{ title: "New chama — ROSCA" }] }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <NewGroup />
      </AppShell>
    </RequireAuth>
  ),
});

function NewGroup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("200000");
  const [memberCount, setMemberCount] = useState("6");
  const [startMonth, setStartMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [whatsapp, setWhatsapp] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const startDate = `${startMonth}-01`;
      const memberCountNum = parseInt(memberCount, 10);

      const { data: group, error: gErr } = await supabase
        .from("groups")
        .insert({
          name,
          description: description || null,
          contribution_amount: parseFloat(amount),
          currency: "TZS",
          member_count: memberCountNum,
          start_month: startDate,
          whatsapp_link: whatsapp || null,
          created_by: user.id,
          status: "setup",
        })
        .select()
        .single();
      if (gErr) throw gErr;

      // Add the creator as the first admin member
      const { error: mErr } = await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: user.id,
        invited_email: user.email!,
        invited_name: user.user_metadata?.display_name ?? user.email,
        position: 1,
        role: "admin",
        status: "active",
        joined_at: new Date().toISOString(),
      });
      if (mErr) throw mErr;

      // Create the first cycle (length = member_count months)
      const end = new Date(startDate);
      end.setMonth(end.getMonth() + memberCountNum - 1);
      const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-01`;
      await supabase.from("cycles").insert({
        group_id: group.id,
        cycle_number: 1,
        start_month: startDate,
        end_month: endDate,
        status: "active",
      });

      toast.success("Chama created. Now add your members.");
      navigate({ to: "/groups/$groupId", params: { groupId: group.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Could not create group");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/dashboard">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </Button>

      <h1 className="text-3xl font-bold tracking-tight mb-1">Create your chama</h1>
      <p className="text-muted-foreground mb-8">
        Set the basics. You'll add members and define payout order on the next screen.
      </p>

      <form onSubmit={submit} className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Chama name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Wajenzi Wetu" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="desc">Description (optional)</Label>
          <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Contribution / month (TZS)</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              step="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="count">Number of members</Label>
            <Input
              id="count"
              type="number"
              min="2"
              max="50"
              value={memberCount}
              onChange={(e) => setMemberCount(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Cycle length = {memberCount || "?"} months
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="month">Start month</Label>
            <Input
              id="month"
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa">WhatsApp group link (optional)</Label>
            <Input
              id="wa"
              type="url"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="https://chat.whatsapp.com/…"
            />
          </div>
        </div>

        <div className="pt-2 flex gap-3">
          <Button type="submit" variant="hero" size="lg" disabled={busy}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Create chama
          </Button>
          <Button asChild type="button" variant="ghost" size="lg">
            <Link to="/dashboard">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
