import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Clock, Loader2, ArrowRight, Trophy, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { sendBriqSms } from "@/lib/briq.functions";

type Member = {
  id: string;
  invited_email: string | null;
  invited_phone?: string | null;
  invited_name: string | null;
  position: number;
  status: string;
};

type Cycle = {
  id: string;
  cycle_number: number;
  start_month: string;
  end_month: string;
  status: string;
};

type Contribution = {
  id: string;
  member_id: string;
  amount: number;
  paid_amount: number | null;
  status: "pending" | "paid" | "late";
  paid_at: string | null;
  month: string;
};

type Payout = {
  id: string;
  recipient_member_id: string;
  amount: number;
  status: "pending" | "completed";
  paid_at: string | null;
  month: string;
};

type Props = {
  groupId: string;
  isAdmin: boolean;
  members: Member[];
  contributionAmount: number;
  currency: string;
  memberCount: number;
  currentCycleNumber: number;
  startMonth: string;
};

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

const monthLabel = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "long", year: "numeric" });

const addMonths = (iso: string, n: number) => {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

export function CycleTracker({
  groupId,
  isAdmin,
  members,
  contributionAmount,
  currency,
  memberCount,
  currentCycleNumber,
  startMonth,
}: Props) {
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [contribs, setContribs] = useState<Contribution[]>([]);
  const [payout, setPayout] = useState<Payout | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const sendSms = useServerFn(sendBriqSms);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: c } = await supabase
      .from("cycles")
      .select("*")
      .eq("group_id", groupId)
      .eq("cycle_number", currentCycleNumber)
      .maybeSingle();
    setCycle(c as Cycle | null);

    if (c) {
      const month = selectedMonth || addMonths(c.start_month, currentCycleNumber - 1 - 0);
      // Default selected month = current payout slot in cycle (start + (currentCycle-1) months)
      // But for tracking, default to start_month of cycle for first time
      const monthToLoad = selectedMonth || addMonths(c.start_month, 0);
      if (!selectedMonth) setSelectedMonth(monthToLoad);

      const [{ data: cs }, { data: po }] = await Promise.all([
        supabase
          .from("contributions")
          .select("*")
          .eq("cycle_id", c.id)
          .eq("month", monthToLoad),
        supabase
          .from("payouts")
          .select("*")
          .eq("cycle_id", c.id)
          .eq("month", monthToLoad)
          .maybeSingle(),
      ]);
      setContribs((cs ?? []) as Contribution[]);
      setPayout((po as Payout | null) ?? null);
    }
    setLoading(false);
  }, [groupId, currentCycleNumber, selectedMonth]);

  useEffect(() => {
    load();
  }, [load]);

  const monthOptions = (() => {
    if (!cycle) return [] as { value: string; label: string; position: number }[];
    return Array.from({ length: memberCount }).map((_, i) => {
      const m = addMonths(cycle.start_month, i);
      return { value: m, label: monthLabel(m), position: i + 1 };
    });
  })();

  const positionForMonth = (monthIso: string) => {
    if (!cycle) return 1;
    const start = new Date(cycle.start_month);
    const cur = new Date(monthIso);
    return (cur.getFullYear() - start.getFullYear()) * 12 + (cur.getMonth() - start.getMonth()) + 1;
  };

  const seedMonth = async () => {
    if (!cycle || !selectedMonth) return;
    if (members.length < memberCount) {
      toast.error(`Add all ${memberCount} members before tracking payments.`);
      return;
    }
    setSeeding(true);
    try {
      const rows = members.map((m) => ({
        group_id: groupId,
        cycle_id: cycle.id,
        member_id: m.id,
        month: selectedMonth,
        amount: contributionAmount,
        status: "pending" as const,
      }));
      const { error: cErr } = await supabase.from("contributions").insert(rows);
      if (cErr) throw cErr;

      const pos = positionForMonth(selectedMonth);
      const recipient = members.find((m) => m.position === pos);
      if (recipient) {
        const { error: pErr } = await supabase.from("payouts").insert({
          group_id: groupId,
          cycle_id: cycle.id,
          recipient_member_id: recipient.id,
          month: selectedMonth,
          amount: contributionAmount * memberCount,
          status: "pending",
        });
        if (pErr) throw pErr;
      }
      toast.success("Month opened for tracking.");
      await load();
    } catch (err: any) {
      toast.error(err.message ?? "Could not open month");
    } finally {
      setSeeding(false);
    }
  };

  const togglePaid = async (c: Contribution) => {
    const next = c.status === "paid" ? "pending" : "paid";
    const { error } = await supabase
      .from("contributions")
      .update({
        status: next,
        paid_amount: next === "paid" ? c.amount : 0,
        paid_at: next === "paid" ? new Date().toISOString() : null,
      })
      .eq("id", c.id);
    if (error) toast.error(error.message);
    else load();
  };

  const completePayout = async () => {
    if (!payout) return;
    const { error } = await supabase
      .from("payouts")
      .update({ status: "completed", paid_at: new Date().toISOString() })
      .eq("id", payout.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Payout marked completed.");
      load();
    }
  };

  const reversePayout = async () => {
    if (!payout) return;
    const { error } = await supabase
      .from("payouts")
      .update({ status: "pending", paid_at: null })
      .eq("id", payout.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Payout reversed to pending.");
      load();
    }
  };

  const memberById = (id: string) => members.find((m) => m.id === id);
  const paidCount = contribs.filter((c) => c.status === "paid").length;
  const pool = contribs.reduce((s, c) => s + Number(c.paid_amount ?? 0), 0);

  const waLink = (phone: string | null | undefined, text: string) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, "");
    if (!digits) return null;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  };

  const monthName = selectedMonth ? monthLabel(selectedMonth) : "";

  const reminderText = (name: string) =>
    `Habari ${name}, hii ni kumbusho kuhusu mchango wa ${monthName} (${fmt(contributionAmount)} ${currency}) katika chama chetu. Tafadhali kamilisha mchango wako. Asante!`;

  const congratsText = (name: string) =>
    `Hongera ${name}! Umekamilisha mchango wako wa ${monthName} (${fmt(contributionAmount)} ${currency}). Asante kwa kuwa mwaminifu kwa chama. 🎉`;

  const openAllWhatsApp = (rows: { phone: string | null | undefined; text: string }[]) => {
    const links = rows
      .map((r) => waLink(r.phone, r.text))
      .filter((u): u is string => !!u);
    if (links.length === 0) {
      toast.error("No members with valid phone numbers.");
      return;
    }
    links.forEach((url, i) => {
      // Stagger window.open so the browser doesn't block them all
      setTimeout(() => window.open(url, "_blank", "noopener,noreferrer"), i * 350);
    });
    toast.success(`Opening WhatsApp for ${links.length} member${links.length === 1 ? "" : "s"}…`);
  };

  const remindAllUnpaid = () => {
    const rows = contribs
      .filter((c) => c.status !== "paid")
      .map((c) => {
        const m = memberById(c.member_id);
        return {
          phone: m?.invited_phone,
          text: reminderText(m?.invited_name ?? "mwanachama"),
        };
      });
    openAllWhatsApp(rows);
  };

  const congratsAllPaid = () => {
    const rows = contribs
      .filter((c) => c.status === "paid")
      .map((c) => {
        const m = memberById(c.member_id);
        return {
          phone: m?.invited_phone,
          text: congratsText(m?.invited_name ?? "mwanachama"),
        };
      });
    openAllWhatsApp(rows);
  };

  const sendSmsBatch = async (
    rows: { phone: string | null | undefined; text: string }[],
    label: string,
  ) => {
    const recipients = rows
      .filter((r) => !!r.phone)
      .map((r) => ({ phone: r.phone!, content: r.text }));
    if (recipients.length === 0) {
      toast.error("No members with phone numbers.");
      return;
    }
    setSendingSms(true);
    try {
      const res = await sendSms({ data: { recipients, groupId } });
      if (res.error && res.sent === 0) {
        toast.error(res.error);
      } else if (res.failed > 0) {
        toast.warning(
          `${label}: sent ${res.sent}, failed ${res.failed}${res.error ? ` · ${res.error}` : ""}`,
        );
      } else {
        toast.success(`${label}: SMS sent to ${res.sent} member${res.sent === 1 ? "" : "s"}.`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Could not send SMS");
    } finally {
      setSendingSms(false);
    }
  };

  const smsRemindUnpaid = () =>
    sendSmsBatch(
      contribs
        .filter((c) => c.status !== "paid")
        .map((c) => {
          const m = memberById(c.member_id);
          return {
            phone: m?.invited_phone,
            text: reminderText(m?.invited_name ?? "mwanachama"),
          };
        }),
      "Reminders",
    );

  const smsCongratsPaid = () =>
    sendSmsBatch(
      contribs
        .filter((c) => c.status === "paid")
        .map((c) => {
          const m = memberById(c.member_id);
          return {
            phone: m?.invited_phone,
            text: congratsText(m?.invited_name ?? "mwanachama"),
          };
        }),
      "Congrats",
    );

  const smsOne = (c: Contribution) => {
    const m = memberById(c.member_id);
    const paid = c.status === "paid";
    const text = paid
      ? congratsText(m?.invited_name ?? "mwanachama")
      : reminderText(m?.invited_name ?? "mwanachama");
    sendSmsBatch([{ phone: m?.invited_phone, text }], paid ? "Congrats" : "Reminder");
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-semibold">Monthly tracking</h2>
          <p className="text-sm text-muted-foreground">
            Cycle {currentCycleNumber} · contributions & payouts
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="month-pick" className="text-xs">Month</Label>
            <select
              id="month-pick"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {monthOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  #{o.position} · {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : contribs.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-xl">
          <p className="text-sm text-muted-foreground mb-3">
            This month hasn't been opened for tracking yet.
          </p>
          {isAdmin ? (
            <Button onClick={seedMonth} variant="hero" disabled={seeding}>
              {seeding && <Loader2 className="w-4 h-4 animate-spin" />}
              Open {monthLabel(selectedMonth)}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">An admin needs to open this month.</p>
          )}
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="font-semibold">{paidCount}/{contribs.length}</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Collected</p>
              <p className="font-semibold">{fmt(pool)} {currency}</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Target pool</p>
              <p className="font-semibold">{fmt(contributionAmount * memberCount)} {currency}</p>
            </div>
          </div>

          {/* Recipient banner */}
          {payout && (
            <div className="flex items-center justify-between gap-3 bg-gradient-to-br from-gold/15 via-card to-card border border-gold/30 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <Trophy className="w-5 h-5 text-gold-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Recipient · {monthLabel(payout.month)}
                  </p>
                  <p className="font-semibold truncate">
                    {memberById(payout.recipient_member_id)?.invited_name ??
                      memberById(payout.recipient_member_id)?.invited_email ??
                      "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(payout.amount)} {currency} ·{" "}
                    {payout.status === "completed" ? "paid out" : "pending payout"}
                  </p>
                </div>
              </div>
              {isAdmin && payout.status === "pending" && (
                <Button onClick={completePayout} variant="gold" size="sm">
                  Mark paid out <ArrowRight className="w-4 h-4" />
                </Button>
              )}
              {isAdmin && payout.status === "completed" && (
                <Button onClick={reversePayout} variant="outline" size="sm">
                  Undo paid out
                </Button>
              )}
            </div>
          )}

          {/* Bulk WhatsApp + SMS actions */}
          {isAdmin && (
            <div className="space-y-2 mb-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={remindAllUnpaid}
                  disabled={contribs.every((c) => c.status === "paid")}
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp: remind unpaid
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={congratsAllPaid}
                  disabled={paidCount === 0}
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp: congrats paid
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="hero"
                  onClick={smsRemindUnpaid}
                  disabled={sendingSms || contribs.every((c) => c.status === "paid")}
                >
                  {sendingSms ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  SMS: remind unpaid
                </Button>
                <Button
                  size="sm"
                  variant="hero"
                  onClick={smsCongratsPaid}
                  disabled={sendingSms || paidCount === 0}
                >
                  {sendingSms ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  SMS: congrats paid
                </Button>
              </div>
            </div>
          )}

          {/* Contributions list */}
          <ul className="divide-y divide-border">
            {contribs
              .slice()
              .sort((a, b) => (memberById(a.member_id)?.position ?? 0) - (memberById(b.member_id)?.position ?? 0))
              .map((c) => {
                const m = memberById(c.member_id);
                const paid = c.status === "paid";
                const text = paid
                  ? congratsText(m?.invited_name ?? "mwanachama")
                  : reminderText(m?.invited_name ?? "mwanachama");
                const wa = waLink(m?.invited_phone, text);
                return (
                  <li key={c.id} className="flex items-center gap-3 py-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center shrink-0">
                      {m?.position ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{m?.invited_name ?? m?.invited_email}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmt(c.amount)} {currency}
                        {paid && c.paid_at && ` · paid ${new Date(c.paid_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    {paid ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" /> paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        <Clock className="w-3 h-3" /> pending
                      </span>
                    )}
                    {wa && (
                      <Button asChild size="sm" variant="ghost" title={paid ? "Send congrats on WhatsApp" : "Send reminder on WhatsApp"}>
                        <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    {isAdmin && m?.invited_phone && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={sendingSms}
                        onClick={() => smsOne(c)}
                        title={paid ? "Send congrats SMS via Briq" : "Send reminder SMS via Briq"}
                        aria-label="SMS"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    )}
                    {isAdmin && (
                      <Button size="sm" variant={paid ? "ghost" : "hero"} onClick={() => togglePaid(c)}>
                        {paid ? "Undo" : "Mark paid"}
                      </Button>
                    )}
                  </li>
                );
              })}
          </ul>
        </>
      )}
    </div>
  );
}
