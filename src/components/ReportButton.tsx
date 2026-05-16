import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Target = "post" | "reply" | "user";

interface Props {
  targetType: Target;
  targetId: string;
  size?: "sm" | "xs";
}

export function ReportButton({ targetType, targetId, size = "sm" }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const submit = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < 3) { toast.error("Please describe the issue (min 3 chars)"); return; }
    if (trimmed.length > 1000) { toast.error("Reason too long"); return; }
    setLoading(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason: trimmed,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Report submitted. Thank you.");
    setReason("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => e.stopPropagation()}
          className={size === "xs" ? "h-6 px-2 text-xs text-muted-foreground hover:text-destructive" : "text-muted-foreground hover:text-destructive"}
        >
          <Flag className="h-3 w-3 mr-1" /> Report
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Report this {targetType}</DialogTitle>
        </DialogHeader>
        <Textarea
          placeholder="What's wrong? (spam, harassment, etc.)"
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={1000}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading} className="bg-gradient-primary">
            {loading ? "Submitting..." : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
