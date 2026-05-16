import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/games")({
  component: Games,
  head: () => ({ meta: [{ title: "Games — UnityRevoea" }] }),
});

const GAMES = [
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
    <main className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold">What we're <span className="text-gradient">playing</span></h1>
        <p className="mt-2 text-muted-foreground">Pick a game, find your people.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {GAMES.map((g) => (
          <div key={g.name} className="glass rounded-2xl p-5 shadow-card hover:shadow-glow hover:-translate-y-0.5 transition-all">
            <div className="text-4xl mb-3">{g.emoji}</div>
            <div className="font-semibold">{g.name}</div>
            <div className="text-xs text-muted-foreground">{g.tag}</div>
            <div className="mt-3 text-xs text-primary-glow">{g.players} active</div>
          </div>
        ))}
      </div>
    </main>
  );
}
