import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Props {
  username: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  xs: "h-5 w-5 text-[10px]",
  sm: "h-7 w-7 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-24 w-24 text-2xl",
};

export function UserAvatar({ username, avatarUrl, size = "sm", className }: Props) {
  const initials = (username || "?").slice(0, 2).toUpperCase();
  return (
    <Avatar className={cn(SIZES[size], "ring-1 ring-border/60", className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={username} />}
      <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
