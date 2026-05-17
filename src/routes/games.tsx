import { createFileRoute, Link } from "@tanstack/react-router";
import { Gamepad2, Play, Users } from "lucide-react";

export const Route = createFileRoute("/games")({
  component: Games,
  head: () => ({ meta: [{ title: "Games — UnityRevoea" }] }),
});

const PLAYABLE = [
  { slug: "tic-tac-toe", name: "Tic Tac Toe", tag: "Strategy · vs AI", emoji: "❌⭕", desc: "Beat the bot in a classic 3×3 showdown." },
  { slug: "memory", name: "Memory Match", tag: "Puzzle · Solo", emoji: "🧠", desc: "Flip the cards, match the pairs, beat your time." },
  { slug: "reaction", name: "Reaction Test", tag: "Reflex · Solo", emoji: "⚡", desc: "How fast are you really? Find out in 5 rounds." },
  { slug: "clicker", name: "Click Storm", tag: "Arcade · 10s", emoji: "🖱️", desc: "Click as many targets as you can in 10 seconds." },
] as const;

const COMMUNITY = [
  { name: "Minecraft", tag: "Sandbox", emoji: "⛏️", players: "2.1k" },
  { name: "Fortnite", tag: "Battle Royale", emoji: "🎯", players: "1.8k" },
  { name: "Valorant", tag: "Tac Shooter", emoji: "🔫", players: "1.4k" },
  { name: "League of Legends", tag: "MOBA", emoji: "⚔️", players: "1.2k" },
  { name: "Rocket League", tag: "Sports", emoji: "🚗", players: "890" },
  { name: "Roblox", tag: "Platform", emoji: "🟥", players: "1.6k" },
  { name: "Apex Legends", tag: "Battle Royale", emoji: "🪂", players: "740" },
  { name: "Stardew Valley", tag: "Cozy", emoji: "🌾", players: "510" },
];

function Games() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <section>
        <div className="mb-6 flex items-end justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold inline-flex items-center gap-3">
              <Gamepad2 className="h-9 w-9 text-primary-glow" />
              Play <span className="text-gradient">in-browser</span>
            </h1>
            <p className="mt-2 text-muted-foreground">Custom mini-games built right into UnityRevoea. No download.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLAYABLE.map((g) => (
            <Link
              key={g.slug}
              to="/games/$gameId"
              params={{ gameId: g.slug }}
              className="group glass rounded-2xl p-5 shadow-card hover:shadow-glow hover:-translate-y-0.5 transition-all border border-border/40 hover:border-primary/50"
            >
              <div className="text-4xl mb-3">{g.emoji}</div>
              <div className="font-semibold">{g.name}</div>
              <div className="text-xs text-muted-foreground">{g.tag}</div>
              <p className="mt-2 text-xs text-muted-foreground/80 line-clamp-2">{g.desc}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary-glow">
                <Play className="h-3 w-3" /> Play now
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <div className="mb-6">
          <h2 className="text-3xl font-bold inline-flex items-center gap-2">
            <Users className="h-7 w-7 text-primary-glow" />
            What we're <span className="text-gradient">playing</span>
          </h2>
          <p className="mt-2 text-muted-foreground">Find your people in the community.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COMMUNITY.map((g) => (
            <div key={g.name} className="glass rounded-2xl p-5 shadow-card hover:shadow-glow hover:-translate-y-0.5 transition-all">
              <div className="text-4xl mb-3">{g.emoji}</div>
              <div className="font-semibold">{g.name}</div>
              <div className="text-xs text-muted-foreground">{g.tag}</div>
              <div className="mt-3 text-xs text-primary-glow">{g.players} active</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
