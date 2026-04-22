import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Link2 } from "lucide-react";
import { toast } from "sonner";

export function InviteLink({ groupId }: { groupId: string }) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${groupId}`
      : `/join/${groupId}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Invite link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="w-4 h-4 text-primary" />
        <h3 className="font-semibold">Invite link</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Share this link with invited members. After they sign up with the email you added,
        they can open this link to confirm and access the chama.
      </p>
      <div className="flex gap-2">
        <Input readOnly value={url} className="font-mono text-xs" />
        <Button onClick={copy} variant="outline" size="icon" aria-label="Copy link">
          {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
