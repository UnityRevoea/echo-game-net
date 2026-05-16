import { Link, useNavigate } from "@tanstack/react-router";
import { Gamepad2, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function Nav() {
  const { user, profile, isAdmin, isStaff, signOut } = useAuth();
  const navigate = useNavigate();

  const links = [
    { to: "/games", label: "Games" },
    { to: "/community", label: "Community" },
    { to: "/community", label: "Forums" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 backdrop-blur-xl bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow group-hover:scale-105 transition-transform">
            <Gamepad2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">
            Unity<span className="text-gradient">Revoea</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l, i) => (
            <Link
              key={i}
              to={l.to}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              activeProps={{ className: "px-3 py-2 text-sm font-medium text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
          {isStaff && (
            <Link
              to="/admin"
              className="px-3 py-2 text-sm font-medium text-gold hover:text-gold/80 inline-flex items-center gap-1"
            >
              <Shield className="h-4 w-4" /> {isAdmin ? "Admin" : "Staff"}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user && profile ? (
            <>
              <Link
                to="/profile/$username"
                params={{ username: profile.username }}
                className="text-sm font-medium hover:text-primary-glow"
              >
                @{profile.username}
              </Link>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => { await signOut(); navigate({ to: "/" }); }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button size="sm" variant="ghost">Login</Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="bg-gradient-primary shadow-glow hover:opacity-90">
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
