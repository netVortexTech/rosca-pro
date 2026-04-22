import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Link2 } from "lucide-react";
import { toast } from "sonner";

export function InviteLink({ inviteCode }: { inviteCode: string }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/invitation?code=${inviteCode}`
      : `/invitation?code=${inviteCode}`;

  const copy = async (text: string, kind: "link" | "code") => {
    try {
      await navigator.clipboard.writeText(text);
      if (kind === "link") {
        setCopiedLink(true);
        toast.success("Invite link copied");
        setTimeout(() => setCopiedLink(false), 1500);
      } else {
        setCopiedCode(true);
        toast.success("Invite code copied");
        setTimeout(() => setCopiedCode(false), 1500);
      }
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="w-4 h-4 text-primary" />
        <h3 className="font-semibold">Invite link & code</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Share either the link or the short code. Members open it, sign up with the phone number
        you invited, and they're in — no email needed.
      </p>

      <div className="grid sm:grid-cols-[auto_1fr_auto] gap-2 items-center mb-2">
        <span className="text-xs text-muted-foreground sm:pr-2">Code</span>
        <Input
          readOnly
          value={inviteCode}
          className="font-mono tracking-widest uppercase text-base"
        />
        <Button
          onClick={() => copy(inviteCode, "code")}
          variant="outline"
          size="icon"
          aria-label="Copy code"
        >
          {copiedCode ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>

      <div className="grid sm:grid-cols-[auto_1fr_auto] gap-2 items-center">
        <span className="text-xs text-muted-foreground sm:pr-2">Link</span>
        <Input readOnly value={url} className="font-mono text-xs" />
        <Button
          onClick={() => copy(url, "link")}
          variant="outline"
          size="icon"
          aria-label="Copy link"
        >
          {copiedLink ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
