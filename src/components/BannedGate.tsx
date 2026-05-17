import { Ban, Clock, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function BannedGate() {
  const { profile, signOut } = useAuth();
  if (!profile) return null;
  const suspendedUntil = profile.suspended_until ? new Date(profile.suspended_until) : null;
  const isSuspended = !!suspendedUntil && suspendedUntil > new Date();
  if (!profile.banned && !isSuspended) return null;

  const banned = profile.banned;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md p-4">
      <div className="max-w-md w-full glass rounded-3xl p-8 text-center border border-destructive/40 shadow-glow">
        <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center ${banned ? "bg-destructive/20 text-destructive" : "bg-amber-500/20 text-amber-300"}`}>
          {banned ? <Ban className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
        </div>
        <h1 className="mt-4 text-2xl font-bold">
          {banned ? "Your account has been banned" : "Your account is suspended"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {banned
            ? "You no longer have access to UnityRevoea. If you believe this was a mistake, contact a staff member."
            : `You can't use UnityRevoea until ${suspendedUntil!.toLocaleString()}. Take a break and come back then.`}
        </p>
        <Button
          onClick={() => signOut()}
          className="mt-6 w-full"
          variant="outline"
        >
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </div>
    </div>
  );
}
