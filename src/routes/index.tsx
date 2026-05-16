import { createFileRoute, Link } from "@tanstack/react-router";
import { Gamepad2, MessageSquare, Trophy, Users, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "UnityRevoea — A chill gaming community" },
      { name: "description", content: "Hang out, post in the forums, earn badges. The gaming community for people who like good vibes." },
    ],
  }),
});

function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, oklch(0.65 0.24 295 / 0.4) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32 text-center">
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs font-medium text-primary-glow mb-6">
            <Sparkles className="h-3 w-3" /> The community is live
          </div>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight">
            Game. Chill.<br />
            <span className="text-gradient">Hang out.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            UnityRevoea is a relaxed corner of the internet for gamers — talk shop in the forums, build your profile, collect badges, find your crew.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="bg-gradient-primary shadow-glow hover:opacity-90 h-12 px-6">
                Join the community <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/community">
              <Button size="lg" variant="outline" className="h-12 px-6 border-border/60">
                Browse forums
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { Icon: Gamepad2, title: "Games", desc: "Talk about what you're playing right now." },
            { Icon: MessageSquare, title: "Forums", desc: "Threads, replies, the whole vibe." },
            { Icon: Trophy, title: "Badges", desc: "Earn achievements for being a real one." },
            { Icon: Users, title: "Community", desc: "Find people who actually want to hang out." },
          ].map(({ Icon, title, desc }) => (
            <div key={title} className="glass rounded-2xl p-6 shadow-card hover:shadow-glow transition-shadow">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary mb-4">
                <Icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 pb-24">
        <div className="glass rounded-3xl p-10 text-center shadow-card">
          <h2 className="text-3xl sm:text-4xl font-bold">Ready to jump in?</h2>
          <p className="mt-3 text-muted-foreground">Free forever. Make a profile in 30 seconds.</p>
          <Link to="/signup" className="inline-block mt-6">
            <Button size="lg" className="bg-gradient-primary shadow-glow">Create account</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
