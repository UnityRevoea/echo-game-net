import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Plus, Search, X, AlertTriangle, EyeOff as EyeOffIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, topRole, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleBadge } from "@/components/RoleBadge";
import { ReportButton } from "@/components/ReportButton";
import { UserAvatar } from "@/components/UserAvatar";
import { FormatToolbar } from "@/components/FormatToolbar";
import { POST_CATEGORIES, getCategory, type PostCategory } from "@/lib/forum-constants";
import { useBlockedUsers } from "@/lib/blocked";
import { splitContentWarning } from "@/lib/markdown";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/community")({
  component: Community,
  head: () => ({ meta: [{ title: "Community Forums — UnityRevoea" }] }),
});

interface PostRow {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  author_id: string;
  author?: { username: string; banned: boolean; avatar_url: string | null };
  authorRoles: AppRole[];
  replyCount: number;
}

const DRAFT_KEY = "ur_post_draft";

function Community() {
  const { user, profile } = useAuth();
  const { isBlocked } = useBlockedUsers();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ title: string; content: string; category: PostCategory; cw: string }>(() => {
    if (typeof window === "undefined") return { title: "", content: "", category: "general", cw: "" };
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* noop */ }
    return { title: "", content: "", category: "general", cw: "" };
  });
  const [posting, setPosting] = useState(false);
  const [filter, setFilter] = useState<PostCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"new" | "active">("new");
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Persist draft
  useEffect(() => {
    if (form.title || form.content || form.cw) localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  const load = async () => {
    setLoading(true);
    const { data: rawPosts } = await supabase
      .from("forum_posts")
      .select("id, title, content, category, created_at, author_id")
      .order("created_at", { ascending: false })
      .limit(100);

    const list = rawPosts ?? [];
    const authorIds = [...new Set(list.map((p) => p.author_id))];
    const postIds = list.map((p) => p.id);

    const [{ data: profs }, { data: roles }, { data: replies }] = await Promise.all([
      authorIds.length
        ? supabase.from("profiles").select("id, username, banned, avatar_url").in("id", authorIds)
        : Promise.resolve({ data: [] as { id: string; username: string; banned: boolean; avatar_url: string | null }[] }),
      authorIds.length
        ? supabase.from("user_roles").select("user_id, role").in("user_id", authorIds)
        : Promise.resolve({ data: [] as { user_id: string; role: AppRole }[] }),
      postIds.length
        ? supabase.from("forum_replies").select("post_id").in("post_id", postIds)
        : Promise.resolve({ data: [] as { post_id: string }[] }),
    ]);

    const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
    const roleMap = new Map<string, AppRole[]>();
    (roles ?? []).forEach((r) => {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });
    const replyCount = new Map<string, number>();
    (replies ?? []).forEach((r) => replyCount.set(r.post_id, (replyCount.get(r.post_id) ?? 0) + 1));

    setPosts(
      list.map((p) => ({
        ...p,
        author: profMap.get(p.author_id),
        authorRoles: roleMap.get(p.author_id) ?? [],
        replyCount: replyCount.get(p.id) ?? 0,
      })),
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Log in to post"); return; }
    if (profile?.banned) { toast.error("Your account is banned"); return; }
    if (form.title.trim().length < 3) { toast.error("Title needs at least 3 characters"); return; }
    if (form.content.trim().length < 10) { toast.error("Content needs at least 10 characters"); return; }
    setPosting(true);
    const cwPrefix = form.cw.trim() ? `[CW: ${form.cw.trim().slice(0, 80)}]\n\n` : "";
    const { error } = await supabase.from("forum_posts").insert({
      author_id: user.id,
      title: form.title.trim().slice(0, 200),
      content: (cwPrefix + form.content.trim()).slice(0, 5000),
      category: form.category,
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Posted!");
    setForm({ title: "", content: "", category: "general", cw: "" });
    localStorage.removeItem(DRAFT_KEY);
    setShowForm(false);
    load();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts
      .filter((p) => !isBlocked(p.author_id))
      .filter((p) => {
        if (filter !== "all" && p.category !== filter) return false;
        if (q && !p.title.toLowerCase().includes(q) && !p.content.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => sort === "active" ? b.replyCount - a.replyCount : 0);
  }, [posts, filter, search, sort, isBlocked]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
            Live · {posts.length} threads
          </div>
          <h1 className="mt-2 text-4xl sm:text-5xl font-bold tracking-tight">Forums</h1>
          <p className="mt-1 text-muted-foreground text-sm">Drop a take. Find your crew. Be nice.</p>
        </div>
        {user && (
          <Button onClick={() => setShowForm((v) => !v)} size="lg" className="bg-gradient-primary shadow-glow">
            {showForm ? <><X className="h-4 w-4 mr-1" /> Close</> : <><Plus className="h-4 w-4 mr-1" /> New thread</>}
          </Button>
        )}
      </div>

      {/* Filter row */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
            filter === "all" ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground/40 text-muted-foreground hover:text-foreground",
          )}
        >
          All
        </button>
        {POST_CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              filter === c.value ? c.chip : "border-border hover:border-foreground/40 text-muted-foreground hover:text-foreground",
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
            {c.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Select value={sort} onValueChange={(v) => setSort(v as "new" | "active")}>
            <SelectTrigger className="h-9 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Newest</SelectItem>
              <SelectItem value="active">Most active</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search threads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 w-56"
            />
          </div>
        </div>
      </div>

      {/* New post form */}
      {showForm && user && (
        <form onSubmit={submit} className="surface rounded-2xl p-6 mb-6 space-y-4 shadow-card">
          <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
            <div>
              <Label htmlFor="title" className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground">Title</Label>
              <Input
                id="title"
                placeholder="Give it a sharp title..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={200}
                className="mt-1.5 h-11 text-base"
              />
              <div className="text-[10px] text-muted-foreground mt-1 text-right font-mono">{form.title.length}/200</div>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as PostCategory })}>
                <SelectTrigger className="mt-1.5 h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POST_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="inline-flex items-center gap-2">
                        <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} /> {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="cw" className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground inline-flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" /> Content warning (optional)
            </Label>
            <Input
              id="cw"
              placeholder="e.g. Elden Ring spoilers, late-game boss"
              value={form.cw}
              onChange={(e) => setForm({ ...form, cw: e.target.value })}
              maxLength={80}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="content" className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground">Body</Label>
            <div className="mt-1.5 rounded-lg border border-input bg-input/40 overflow-hidden">
              <FormatToolbar
                textareaRef={taRef}
                value={form.content}
                onChange={(v) => setForm({ ...form, content: v })}
              />
              <Textarea
                ref={taRef}
                id="content"
                placeholder={"What's on your mind?\n\n**Bold**, *italic*, `code`, > quote, ||spoilers||, [links](https://...)"}
                rows={8}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                maxLength={5000}
                className="border-0 rounded-none focus-visible:ring-0 font-mono text-sm"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1 font-mono">
              <span>Tip: drafts save automatically</span>
              <span>{form.content.length}/5000</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => { setForm({ title: "", content: "", category: "general", cw: "" }); localStorage.removeItem(DRAFT_KEY); }}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Clear draft
            </button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={posting} className="bg-gradient-primary">
                {posting ? "Posting..." : "Publish thread"}
              </Button>
            </div>
          </div>
        </form>
      )}

      {!user && (
        <div className="surface rounded-2xl p-6 mb-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-primary-glow hover:underline font-medium">Log in</Link> or{" "}
          <Link to="/signup" className="text-primary-glow hover:underline font-medium">create an account</Link> to start posting.
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="surface rounded-xl p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface rounded-2xl p-12 text-center text-muted-foreground">
          {search || filter !== "all" ? "Nothing matches your filter." : "No posts yet. Be the first!"}
        </div>
      ) : (
        <div className="surface rounded-2xl divide-y divide-border overflow-hidden shadow-card">
          {filtered.map((p) => {
            const cat = getCategory(p.category);
            const { warning, body } = splitContentWarning(p.content);
            return (
              <Link
                key={p.id}
                to="/forums/$postId"
                params={{ postId: p.id }}
                className="block px-5 py-4 surface-hover"
              >
                <div className="flex items-start gap-4">
                  <UserAvatar
                    username={p.author?.username ?? "?"}
                    avatarUrl={p.author?.avatar_url}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide border rounded-full px-2 py-0.5", cat.chip)}>
                        <span className={cn("h-1 w-1 rounded-full", cat.dot)} />
                        {cat.label}
                      </span>
                      {warning && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide border border-amber-500/30 bg-amber-500/10 text-amber-200 rounded-full px-2 py-0.5">
                          <EyeOffIcon className="h-2.5 w-2.5" /> CW
                        </span>
                      )}
                      <h3 className="font-semibold text-base sm:text-lg truncate">{p.title}</h3>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{warning ? "(hidden — content warning)" : body}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span className="font-medium text-foreground">@{p.author?.username ?? "unknown"}</span>
                      <RoleBadge role={topRole(p.authorRoles)} />
                      <span className="text-muted-foreground/50">·</span>
                      <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {p.replyCount}</span>
                      <span className="text-muted-foreground/50">·</span>
                      <span className="font-mono text-[11px]">{timeAgo(p.created_at)}</span>
                      <span className="ml-auto" onClick={(e) => e.preventDefault()}>
                        <ReportButton targetType="post" targetId={p.id} size="xs" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
