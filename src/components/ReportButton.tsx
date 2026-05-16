import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { REPORT_CATEGORIES, type ReportCategory } from "@/lib/forum-constants";

type Target = "post" | "reply" | "user";

interface Props {
  targetType: Target;
  targetId: string;
  size?: "sm" | "xs";
}

export function ReportButton({ targetType, targetId, size = "sm" }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory | "">("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const submit = async () => {
    if (!category) { toast.error("Pick a report category"); return; }
    const trimmed = reason.trim();
    if (category === "other" && trimmed.length < 5) {
      toast.error("Please describe the issue (min 5 chars)");
      return;
    }
    if (trimmed.length > 1000) { toast.error("Details too long (max 1000)"); return; }
    setLoading(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      category,
      reason: trimmed || REPORT_CATEGORIES.find((c) => c.value === category)?.label || "no details",
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Report submitted. Our staff will review it.");
    setReason("");
    setCategory("");
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
      <DialogContent onClick={(e) => e.stopPropagation()} className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report this {targetType}</DialogTitle>
          <DialogDescription>
            Pick the reason that best fits. Reports are private — only staff see them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Reason</Label>
          <RadioGroup value={category} onValueChange={(v) => setCategory(v as ReportCategory)}>
            {REPORT_CATEGORIES.map((c) => (
              <label
                key={c.value}
                htmlFor={`r-${c.value}`}
                className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2 cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-colors"
              >
                <RadioGroupItem value={c.value} id={`r-${c.value}`} />
                <span className="text-sm">{c.label}</span>
              </label>
            ))}
          </RadioGroup>

          <div className="pt-2">
            <Label htmlFor="details" className="text-xs uppercase tracking-wide text-muted-foreground">
              Additional info {category === "other" ? "(required)" : "(optional)"}
            </Label>
            <Textarea
              id="details"
              placeholder="Add context, links, or anything else that helps staff investigate..."
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={1000}
              className="mt-1.5"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading || !category} className="bg-gradient-primary">
            {loading ? "Submitting..." : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
