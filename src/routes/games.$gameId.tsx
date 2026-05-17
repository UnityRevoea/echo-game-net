import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/games/$gameId")({
  component: GamePage,
  head: ({ params }) => ({ meta: [{ title: `${labelFor(params.gameId)} — UnityRevoea` }] }),
});

function labelFor(slug: string) {
  return ({
    "tic-tac-toe": "Tic Tac Toe",
    memory: "Memory Match",
    reaction: "Reaction Test",
    clicker: "Click Storm",
  } as Record<string, string>)[slug] ?? "Game";
}

function GamePage() {
  const { gameId } = Route.useParams();
  const title = labelFor(gameId);
  let Game: React.FC | null = null;
  if (gameId === "tic-tac-toe") Game = TicTacToe;
  else if (gameId === "memory") Game = Memory;
  else if (gameId === "reaction") Game = Reaction;
  else if (gameId === "clicker") Game = Clicker;

  if (!Game) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Game not found</h1>
        <Link to="/games" className="mt-4 inline-block text-primary-glow underline">Back to games</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/games" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> All games
      </Link>
      <h1 className="mt-3 text-3xl sm:text-4xl font-bold">{title}</h1>
      <div className="mt-6 glass rounded-3xl p-6 shadow-card border border-border/40">
        <Game />
      </div>
    </main>
  );
}

/* ---------- Tic Tac Toe ---------- */
type Cell = "X" | "O" | null;
function TicTacToe() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<"X" | "O">("X");
  const winner = calcWinner(board);
  const full = board.every(Boolean);

  useEffect(() => {
    if (turn === "O" && !winner && !full) {
      const t = setTimeout(() => {
        const idx = bestMove(board);
        if (idx >= 0) {
          const b = board.slice(); b[idx] = "O"; setBoard(b); setTurn("X");
        }
      }, 400);
      return () => clearTimeout(t);
    }
  }, [turn, board, winner, full]);

  const play = (i: number) => {
    if (board[i] || winner || turn !== "X") return;
    const b = board.slice(); b[i] = "X"; setBoard(b); setTurn("O");
  };

  const reset = () => { setBoard(Array(9).fill(null)); setTurn("X"); };

  return (
    <div>
      <div className="text-center mb-4 text-sm font-medium">
        {winner ? (winner === "X" ? "🏆 You win!" : "🤖 Bot wins!") : full ? "🤝 Draw" : turn === "X" ? "Your turn (X)" : "Bot thinking..."}
      </div>
      <div className="mx-auto grid grid-cols-3 gap-2 w-full max-w-xs">
        {board.map((c, i) => (
          <button
            key={i}
            onClick={() => play(i)}
            className="aspect-square rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/60 text-4xl font-bold transition-colors disabled:cursor-not-allowed"
            disabled={!!c || !!winner}
          >
            <span className={c === "X" ? "text-primary-glow" : "text-gold"}>{c}</span>
          </button>
        ))}
      </div>
      <div className="mt-5 text-center">
        <Button onClick={reset} variant="outline" size="sm"><RotateCcw className="h-3 w-3 mr-1" /> Reset</Button>
      </div>
    </div>
  );
}
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function calcWinner(b: Cell[]): Cell { for (const [a,c,d] of LINES) if (b[a] && b[a]===b[c] && b[a]===b[d]) return b[a]; return null; }
function bestMove(b: Cell[]): number {
  // try win, then block, then center, then corner, then any
  for (const p of ["O","X"] as const) for (let i=0;i<9;i++) if (!b[i]) { const t=b.slice(); t[i]=p; if (calcWinner(t)===p) return i; }
  if (!b[4]) return 4;
  for (const i of [0,2,6,8]) if (!b[i]) return i;
  for (let i=0;i<9;i++) if (!b[i]) return i;
  return -1;
}

/* ---------- Memory Match ---------- */
const EMOJIS = ["🎮","👾","🕹️","🎯","🏆","⚡","🔥","💎"];
function Memory() {
  const [deck, setDeck] = useState(() => shuffle([...EMOJIS, ...EMOJIS]));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [start] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const won = matched.length === deck.length;

  useEffect(() => {
    if (won) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(t);
  }, [start, won]);

  const flip = (i: number) => {
    if (flipped.includes(i) || matched.includes(i) || flipped.length === 2) return;
    const next = [...flipped, i];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (deck[a] === deck[b]) {
        setTimeout(() => { setMatched((m) => [...m, a, b]); setFlipped([]); }, 350);
      } else {
        setTimeout(() => setFlipped([]), 700);
      }
    }
  };

  const reset = () => { setDeck(shuffle([...EMOJIS, ...EMOJIS])); setFlipped([]); setMatched([]); setMoves(0); setElapsed(0); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 text-sm">
        <span>Moves: <b>{moves}</b></span>
        <span>Time: <b>{elapsed}s</b></span>
        <Button onClick={reset} variant="outline" size="sm"><RotateCcw className="h-3 w-3 mr-1" /> Reset</Button>
      </div>
      {won && <div className="mb-3 text-center text-primary-glow font-semibold">🏆 Done in {moves} moves · {elapsed}s</div>}
      <div className="grid grid-cols-4 gap-2 mx-auto max-w-md">
        {deck.map((emo, i) => {
          const show = flipped.includes(i) || matched.includes(i);
          return (
            <button
              key={i}
              onClick={() => flip(i)}
              className={`aspect-square rounded-xl border border-border/60 text-3xl transition-all ${show ? "bg-primary/20" : "bg-muted/40 hover:bg-muted/60"}`}
            >
              {show ? emo : "?"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
function shuffle<T>(arr: T[]): T[] { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---------- Reaction ---------- */
function Reaction() {
  const [state, setState] = useState<"idle" | "waiting" | "go" | "early" | "done">("idle");
  const [startAt, setStartAt] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const next = () => {
    setState("waiting");
    const wait = 800 + Math.random() * 2500;
    timer.current = setTimeout(() => { setStartAt(Date.now()); setState("go"); }, wait);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const click = () => {
    if (state === "idle" || state === "done") { setTimes([]); next(); return; }
    if (state === "waiting") {
      if (timer.current) clearTimeout(timer.current);
      setState("early");
      return;
    }
    if (state === "go") {
      const t = Date.now() - startAt;
      const newTimes = [...times, t];
      setTimes(newTimes);
      if (newTimes.length >= 5) setState("done");
      else next();
    }
    if (state === "early") next();
  };

  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const bg = state === "go" ? "bg-primary/30" : state === "waiting" ? "bg-destructive/20" : state === "early" ? "bg-amber-500/20" : "bg-muted/40";
  const msg = state === "idle" ? "Click to start" :
    state === "waiting" ? "Wait for green..." :
    state === "go" ? "CLICK!" :
    state === "early" ? "Too early! Click to retry" :
    `Done! Avg ${avg}ms · Best ${Math.min(...times)}ms`;

  return (
    <div>
      <button onClick={click} className={`w-full h-64 rounded-2xl border border-border/60 transition-colors text-2xl font-bold ${bg}`}>
        {msg}
      </button>
      {times.length > 0 && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Round {times.length}/5 · last: <b>{times[times.length - 1]}ms</b>
        </div>
      )}
      {state === "done" && (
        <div className="mt-3 text-center">
          <Button onClick={() => { setTimes([]); setState("idle"); }} variant="outline" size="sm">
            <RotateCcw className="h-3 w-3 mr-1" /> Play again
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---------- Clicker ---------- */
function Clicker() {
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [score, setScore] = useState(0);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [best, setBest] = useState(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem("clicker_best") ?? 0);
  });

  useEffect(() => {
    if (!running) return;
    if (timeLeft <= 0) {
      setRunning(false);
      if (score > best) { setBest(score); localStorage.setItem("clicker_best", String(score)); }
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [running, timeLeft, score, best]);

  const start = () => { setScore(0); setTimeLeft(10); setRunning(true); move(); };
  const move = () => setPos({ x: 5 + Math.random() * 85, y: 5 + Math.random() * 85 });
  const hit = (e: React.MouseEvent) => { e.stopPropagation(); setScore((s) => s + 1); move(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 text-sm">
        <span>Time: <b>{timeLeft}s</b></span>
        <span>Score: <b>{score}</b></span>
        <span>Best: <b className="text-gold">{best}</b></span>
      </div>
      <div className="relative h-72 rounded-2xl bg-muted/30 border border-border/60 overflow-hidden">
        {!running ? (
          <button onClick={start} className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-primary-glow hover:bg-primary/10 transition-colors">
            {score > 0 ? `Final: ${score} · Click to play again` : "Click to start"}
          </button>
        ) : (
          <button
            onClick={hit}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            className="absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-primary shadow-glow active:scale-95 transition-transform"
            aria-label="hit"
          />
        )}
      </div>
    </div>
  );
}
