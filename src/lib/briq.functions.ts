import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BRIQ_URL = "https://karibu.briq.tz/v1/message/send-instant";
const SENDER_ID = "MONEY MAKERS";

type Recipient = {
  phone: string;
  content: string;
  member_id?: string | null;
};

export type SmsResult = {
  phone: string;
  member_id: string | null;
  status: "sent" | "failed";
  error: string | null;
};

function toBriqRecipient(phone: string): string {
  return phone.replace(/\D/g, "");
}

export const sendBriqSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { recipients: Recipient[]; groupId: string; kind?: string }) =>
      input,
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env.BRIQ_API_KEY;
    const empty = { sent: 0, failed: 0, error: null as string | null, results: [] as SmsResult[] };
    if (!apiKey) {
      return { ...empty, error: "BRIQ_API_KEY is not configured" };
    }

    const { data: isAdmin } = await context.supabase.rpc("is_group_admin", {
      _group_id: data.groupId,
      _user_id: context.userId,
    });
    if (!isAdmin) {
      return { ...empty, error: "Only group admins can send SMS." };
    }

    const valid = data.recipients.filter(
      (r) => r.phone && toBriqRecipient(r.phone).length >= 9,
    );
    if (valid.length === 0) {
      return { ...empty, error: "No valid phone numbers." };
    }

    const results: SmsResult[] = [];
    const logRows: any[] = [];
    let sent = 0;
    let failed = 0;

    for (const r of valid) {
      let status: "sent" | "failed" = "failed";
      let error: string | null = null;
      let provider: any = null;

      try {
        const res = await fetch(BRIQ_URL, {
          method: "POST",
          headers: {
            "X-API-Key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: r.content,
            recipients: [toBriqRecipient(r.phone)],
            sender_id: SENDER_ID,
          }),
        });
        provider = await res.json().catch(() => ({}));
        if (res.ok && provider?.success !== false) {
          status = "sent";
          sent++;
        } else {
          failed++;
          error = provider?.message ?? `HTTP ${res.status}`;
        }
      } catch (e: any) {
        failed++;
        error = e?.message ?? "network error";
      }

      results.push({
        phone: r.phone,
        member_id: r.member_id ?? null,
        status,
        error,
      });
      logRows.push({
        group_id: data.groupId,
        member_id: r.member_id ?? null,
        phone: r.phone,
        content: r.content,
        status,
        error,
        provider_response: provider,
        kind: data.kind ?? null,
        sender_id: SENDER_ID,
        sent_by: context.userId,
      });
    }

    // Persist log (best-effort — don't fail the call if logging fails)
    if (logRows.length > 0) {
      const { error: logErr } = await context.supabase
        .from("sms_messages")
        .insert(logRows);
      if (logErr) {
        console.error("sms_messages insert failed:", logErr.message);
      }
    }

    const errorSummary =
      failed > 0
        ? results
            .filter((r) => r.status === "failed")
            .slice(0, 3)
            .map((r) => `${r.phone}: ${r.error ?? "unknown"}`)
            .join(" · ")
        : null;

    return { sent, failed, error: errorSummary, results };
  });
