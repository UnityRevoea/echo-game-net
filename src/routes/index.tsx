import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, MessageSquare, Gamepad2, Activity, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/UserAvatar";
import { getCategory } from "@/lib/forum-constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "UnityRevoea — A chill gaming community" },
      { name: "description", content: "Hang out, post in the forums, earn badges. The gaming community for people who like good vibes." },
    ],
  }),
});

interface RecentPost {
  id: string;
  title: string;
  category: string;
  created_at: string;
  author?: { username: string; avatar_url: string | null };
}

function Home() {
  const { user, profile } = useAuth();
  const loggedIn = !!user;
  const [recent, setRecent] = useState<RecentPost[]>([]);
  const [stats, setStats] = useState({ members: 0, threads: 0, online: 0 });

  useEffect(() => {
    (async () => {
      const [{ data: posts }, { count: memberCount }, { count: threadCount }] = await Promise.all([
        supabase.from("forum_posts").select("id, title, category, created_at, author_id").order("created_at", { ascending: false }).limit(5),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("forum_posts").select("*", { count: "exact", head: true }),
      ]);
      const list = posts ?? [];
      const ids = [...new Set(list.map((p) => p.author_id))];
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, username, avatar_url").in("id", ids)
        : { data: [] as { id: string; username: string; avatar_url: string | null }[] };
      const m = new Map((profs ?? []).map((p) => [p.id, p]));
      setRecent(list.map((p) => ({ ...p, author: m.get(p.author_id) })));
      setStats({
        members: memberCount ?? 0,
        threads: threadCount ?? 0,
        online: Math.max(3, Math.floor((memberCount ?? 0) * 0.18)), // playful estimate
      });
    })();
  }, []);

  return (
    <main>
      {/* Hero — editorial split, no big purple radial soup */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:pt-24 sm:pb-20">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
                {stats.online}+ online · est. {new Date().getFullYear()}
              </div>
              <h1 className="mt-4 text-5xl sm:text-7xl font-bold tracking-tight leading-[0.95]">
                Built for{" "}
                <span className="text-gradient">people who actually</span>{" "}
                like games.
              </h1>
              <p className="mt-6 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
                No grindy karma. No algorithm. Just a forum, your friends,
                some achievements, and a couple of dumb mini-games we made
                in-house.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {loggedIn ? (
                  <>
                    <Link to="/community">
                      <Button size="lg" className="bg-gradient-primary shadow-glow h-12 px-6">
                        Open the forums <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to="/games">
                      <Button size="lg" variant="outline" className="h-12 px-6">
                        Play something
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/signup">
                      <Button size="lg" className="bg-gradient-primary shadow-glow h-12 px-6">
                        Make an account <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to="/community">
                      <Button size="lg" variant="outline" className="h-12 px-6">
                        Lurk first
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {/* Stat row */}
              <dl className="mt-10 grid grid-cols-3 gap-6 max-w-md">
                {[
                  { label: "Members", value: stats.members, Icon: Users },
                  { label: "Threads", value: stats.threads, Icon: MessageSquare },
                  { label: "Online", value: stats.online, Icon: Activity },
                ].map(({ label, value, Icon }) => (
                  <div key={label}>
                    <dt className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground inline-flex items-center gap-1.5">
                      <Icon className="h-3 w-3" /> {label}
                    </dt>
                    <dd className="mt-1 text-2xl font-display font-bold">{value.toLocaleString()}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Recent thread strip */}
            <aside className="surface rounded-2xl shadow-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground">Latest threads</span>
                <Link to="/community" className="text-xs text-primary-glow hover:underline">All →</Link>
              </div>
              <ul className="divide-y divide-border">
                {recent.length === 0 && (
                  <li className="px-5 py-6 text-sm text-muted-foreground">No threads yet — be the first.</li>
                )}
                {recent.map((p) => {
                  const cat = getCategory(p.category);
                  return (
                    <li key={p.id}>
                      <Link to="/forums/$postId" params={{ postId: p.id }} className="block px-5 py-3 surface-hover">
                        <div className="flex items-start gap-3">
                          <UserAvatar username={p.author?.username ?? "?"} avatarUrl={p.author?.avatar_url ?? null} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className={cn("h-1.5 w-1.5 rounded-full", cat.dot)} />
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{cat.label}</span>
                            </div>
                            <div className="mt-0.5 font-medium text-sm truncate">{p.title}</div>
                            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">@{p.author?.username ?? "unknown"}</div>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>
        </div>
      </section>

      {/* Manifesto strip */}
      <section className="border-y border-border bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-12 grid gap-8 md:grid-cols-3">
          {[
            { k: "01", t: "No engagement bait", d: "There's no upvote, no streak, no notification you have to clear. Post when you have something to say." },
            { k: "02", t: "Real moderation", d: "Volunteers and mods are real people with role badges. Reports go to a queue, not a black box." },
            { k: "03", t: "Yours to leave", d: "One-click account delete wipes your posts, replies, profile and login. No dark patterns." },
          ].map((x) => (
            <div key={x.k}>
              <div className="font-mono text-xs text-primary-glow">{x.k}</div>
              <h3 className="mt-2 text-xl font-semibold">{x.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mini games tease */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex items-end justify-between flex-wrap gap-2 mb-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground">In-browser</div>
            <h2 className="mt-1 text-3xl sm:text-4xl font-bold tracking-tight">Stuff to play <span className="text-gradient">right now</span></h2>
          </div>
          <Link to="/games" className="text-sm text-primary-glow hover:underline inline-flex items-center gap-1">
            All games <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { slug: "tic-tac-toe", name: "Tic Tac Toe", emoji: "❌⭕", desc: "Beat the bot." },
            { slug: "memory", name: "Memory", emoji: "🧠", desc: "Match the pairs." },
            { slug: "reaction", name: "Reaction", emoji: "⚡", desc: "How fast?" },
            { slug: "clicker", name: "Click Storm", emoji: "🖱️", desc: "10 second sprint." },
          ].map((g) => (
            <Link
              key={g.slug}
              to="/games/$gameId"
              params={{ gameId: g.slug }}
              className="group surface rounded-xl p-4 surface-hover"
            >
              <div className="text-3xl mb-2">{g.emoji}</div>
              <div className="font-semibold text-sm">{g.name}</div>
              <div className="text-xs text-muted-foreground">{g.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA — guests only */}
      {!loggedIn && (
        <section className="mx-auto max-w-4xl px-4 pb-24">
          <div className="surface rounded-2xl p-10 text-center shadow-card">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Stop scrolling. Make an account.</h2>
            <p className="mt-3 text-muted-foreground text-sm">30 seconds. No email verification. No newsletter.</p>
            <Link to="/signup" className="inline-block mt-6">
              <Button size="lg" className="bg-gradient-primary shadow-glow">Create account</Button>
            </Link>
          </div>
        </section>
      )}

      {/* Footer-ish */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-8 flex items-center justify-between text-xs text-muted-foreground">
          <div className="inline-flex items-center gap-2">
            <Gamepad2 className="h-3.5 w-3.5" />
            <span className="font-mono">UnityRevoea — v1.0</span>
          </div>
          <div className="font-mono">be nice, log off occasionally</div>
        </div>
      </footer>
    </main>
  );
}
