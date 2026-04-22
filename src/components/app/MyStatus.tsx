import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Trophy, Wallet, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Row = {
  group_id: string;
  group_name: string;
  member_id: string;
  position: number;
  member_count: number;
  contribution_amount: number;
  currency: string;
  current_cycle: number;
  due_status: "paid" | "pending" | "late" | "none";
  due_amount: number;
  due_month: string | null;
  is_recipient_this_month: boolean;
  cycles_until_turn: number | null;
};

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

const monthLabel = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", year: "numeric" });

export function MyStatus() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // 1. Get my memberships
      const { data: memberships } = await supabase
        .from("group_members")
        .select(
          "id, position, group_id, groups(id,name,member_count,contribution_amount,currency,current_cycle,start_month)",
        )
        .eq("user_id", user.id)
        .eq("status", "active");

      if (!memberships || memberships.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const out: Row[] = [];
      for (const ms of memberships as any[]) {
        const g = ms.groups;
        if (!g) continue;

        // Position in current cycle: payout slot = (current_cycle months from start_month) — but
        // for tracking we use the most recent open contribution row for me.
        const { data: myDue } = await supabase
          .from("contributions")
          .select("status, amount, month")
          .eq("group_id", g.id)
          .eq("member_id", ms.id)
          .order("month", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Recipient calculation: which member position == current_cycle
        const isRecipient = ms.position === g.current_cycle;
        const cyclesUntil =
          ms.position >= g.current_cycle
            ? ms.position - g.current_cycle
            : g.member_count - g.current_cycle + ms.position;

        out.push({
          group_id: g.id,
          group_name: g.name,
          member_id: ms.id,
          position: ms.position,
          member_count: g.member_count,
          contribution_amount: g.contribution_amount,
          currency: g.currency,
          current_cycle: g.current_cycle,
          due_status: (myDue?.status as Row["due_status"]) ?? "none",
          due_amount: Number(myDue?.amount ?? g.contribution_amount),
          due_month: myDue?.month ?? null,
          is_recipient_this_month: isRecipient,
          cycles_until_turn: cyclesUntil,
        });
      }
      setRows(out);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return null;
  if (rows.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-8">
      <h2 className="text-xl font-semibold mb-1">My status</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Your contributions and payout turn across chamas.
      </p>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.group_id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium truncate">{r.group_name}</p>
                {r.is_recipient_this_month && (
                  <span className="inline-flex items-center gap-1 text-xs text-gold-foreground bg-gold/20 px-1.5 py-0.5 rounded">
                    <Trophy className="w-3 h-3" /> your turn
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Position {r.position} of {r.member_count} ·{" "}
                {r.is_recipient_this_month
                  ? `Receive ${fmt(r.contribution_amount * r.member_count)} ${r.currency} this cycle`
                  : `${r.cycles_until_turn} month${r.cycles_until_turn === 1 ? "" : "s"} until your turn`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {r.due_status === "paid" ? (
                <span className="inline-flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-0.5 rounded">
                  <CheckCircle2 className="w-3 h-3" />
                  Paid {r.due_month && monthLabel(r.due_month)}
                </span>
              ) : r.due_status === "none" ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  <Wallet className="w-3 h-3" /> Not opened yet
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-foreground bg-muted px-2 py-0.5 rounded">
                  <Clock className="w-3 h-3" />
                  Due {fmt(r.due_amount)} {r.currency}
                  {r.due_month && ` · ${monthLabel(r.due_month)}`}
                </span>
              )}
              <Button asChild size="sm" variant="ghost">
                <Link to="/groups/$groupId" params={{ groupId: r.group_id }}>
                  Open <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
