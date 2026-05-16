import { Crown, Shield, Heart } from "lucide-react";
import type { AppRole } from "@/lib/auth";
import { roleLabel } from "@/lib/auth";

export function RoleBadge({ role }: { role: AppRole | null }) {
  if (!role || role === "user") return null;

  const cfg = {
    admin: { Icon: Crown, cls: "bg-gold/15 text-gold border-gold/40" },
    moderator: { Icon: Shield, cls: "bg-primary/15 text-primary-glow border-primary/40" },
    volunteer: { Icon: Heart, cls: "bg-pink/15 text-pink border-pink/40" },
  }[role];

  if (!cfg) return null;
  const { Icon, cls } = cfg;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      <Icon className="h-3 w-3" />
      {roleLabel(role)}
    </span>
  );
}
