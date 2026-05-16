import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, Trophy, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { topRole, type AppRole, type Profile } from "@/lib/auth";
import { RoleBadge } from "@/components/RoleBadge";

export const Route = createFileRoute("/profile/$username")({
  component: ProfilePage,
});

interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  awarded_at: string;
}

function ProfilePage() {
  const { username } = Route.useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: p } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      if (!p) { setLoading(false); return; }
      setProfile(p as Profile);

      const [{ data: r }, { data: ub }, { count }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", p.id),
        supabase
          .from("user_badges")
          .select("awarded_at, badges(id, name, description, icon, color)")
          .eq("user_id", p.id),
        supabase.from("forum_posts").select("*", { count: "exact", head: true }).eq("author_id", p.id),
      ]);

      setRoles((r ?? []).map((x: { role: AppRole }) => x.role));
      setBadges(
        (ub ?? [])
          .filter((x: { badges: unknown }) => x.badges)
          .map((x: { awarded_at: string; badges: { id: string; name: string; description: string; icon: string; color: string } }) => ({
            ...x.badges,
            awarded_at: x.awarded_at,
          })),
      );
      setPostCount(count ?? 0);
      setLoading(false);
    })();
  }, [username]);

  if (loading) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Loading...</main>;
  if (!profile) return <main className="mx-auto max-w-3xl px-4 py-16 text-center">User not found.</main>;

  const initials = profile.username.slice(0, 2).toUpperCase();

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="glass rounded-3xl p-8 shadow-card">
        <div className="flex items-start gap-6 flex-wrap">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-primary text-3xl font-bold shadow-glow">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">@{profile.username}</h1>
              <RoleBadge role={topRole(roles)} />
              {profile.banned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 text-destructive border border-destructive/40 px-2 py-0.5 text-[10px] font-bold uppercase">
                  <Ban className="h-3 w-3" /> Banned
                </span>
              )}
            </div>
            <p className="mt-2 text-muted-foreground">{profile.bio || "No bio yet."}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" /> Joined {new Date(profile.created_at).toLocaleDateString()}</span>
              <span>· {postCount} posts</span>
              <span>· {badges.length} badges</span>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-bold mb-4 inline-flex items-center gap-2"><Trophy className="h-5 w-5 text-gold" /> Badges & Achievements</h2>
        {badges.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-muted-foreground text-sm">No badges yet — keep being awesome.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {badges.map((b) => (
              <div key={b.id} className="glass rounded-xl p-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-primary">
                  <Trophy className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-semibold">{b.name}</div>
                  <div className="text-xs text-muted-foreground">{b.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
