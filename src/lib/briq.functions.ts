import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BRIQ_URL = "https://karibu.briq.tz/v1/message/send-instant";
const SENDER_ID = "MONEY MAKERS";

type Recipient = { phone: string; content: string };

function toBriqRecipient(phone: string): string {
  // Briq expects digits only (e.g. 255712345678) — strip the leading "+".
  return phone.replace(/\D/g, "");
}

export const sendBriqSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { recipients: Recipient[]; groupId: string }) => input,
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env.BRIQ_API_KEY;
    if (!apiKey) {
      return { sent: 0, failed: 0, error: "BRIQ_API_KEY is not configured" };
    }

    // Verify caller is admin of this group (defence in depth, RLS already protects data)
    const { data: isAdmin } = await context.supabase.rpc("is_group_admin", {
      _group_id: data.groupId,
      _user_id: context.userId,
    });
    if (!isAdmin) {
      return { sent: 0, failed: 0, error: "Only group admins can send SMS." };
    }

    const valid = data.recipients.filter(
      (r) => r.phone && toBriqRecipient(r.phone).length >= 9,
    );
    if (valid.length === 0) {
      return { sent: 0, failed: 0, error: "No valid phone numbers." };
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Briq's send-instant accepts a recipients array but uses ONE content string.
    // To personalise per-member, we send one request per recipient.
    for (const r of valid) {
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
        const body = await res.json().catch(() => ({}));
        if (res.ok && body?.success !== false) {
          sent++;
        } else {
          failed++;
          errors.push(
            `${r.phone}: ${body?.message ?? `HTTP ${res.status}`}`,
          );
        }
      } catch (e: any) {
        failed++;
        errors.push(`${r.phone}: ${e?.message ?? "network error"}`);
      }
    }

    return {
      sent,
      failed,
      error: failed > 0 ? errors.slice(0, 3).join(" · ") : null,
    };
  });
