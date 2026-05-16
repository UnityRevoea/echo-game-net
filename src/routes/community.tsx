import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Plus, Search, X } from "lucide-react";
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
import { POST_CATEGORIES, getCategory, type PostCategory } from "@/lib/forum-constants";
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

function Community() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ title: string; content: string; category: PostCategory }>({
    title: "",
    content: "",
    category: "general",
  });
  const [posting, setPosting] = useState(false);
  const [filter, setFilter] = useState<PostCategory | "all">("all");
  const [search, setSearch] = useState("");

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
    const { error } = await supabase.from("forum_posts").insert({
      author_id: user.id,
      title: form.title.trim().slice(0, 200),
      content: form.content.trim().slice(0, 5000),
      category: form.category,
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Posted!");
    setForm({ title: "", content: "", category: "general" });
    setShowForm(false);
    load();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      if (filter !== "all" && p.category !== filter) return false;
      if (q && !p.title.toLowerCase().includes(q) && !p.content.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [posts, filter, search]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Community <span className="text-gradient">forums</span></h1>
          <p className="mt-2 text-muted-foreground text-sm sm:text-base">
            {posts.length} {posts.length === 1 ? "thread" : "threads"} · jump in, drop a take, find your crew.
          </p>
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
            "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
            filter === "all" ? "bg-foreground text-background border-foreground" : "border-border/60 hover:border-border text-muted-foreground hover:text-foreground",
          )}
        >
          All
        </button>
        {POST_CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              filter === c.value ? c.color : "border-border/60 hover:border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {c.label}
          </button>
        ))}
        <div className="ml-auto relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search threads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 w-56"
          />
        </div>
      </div>

      {/* New post form */}
      {showForm && user && (
        <form onSubmit={submit} className="glass rounded-2xl p-6 mb-6 space-y-4 border border-primary/20">
          <div className="grid gap-2 sm:grid-cols-[1fr_220px]">
            <div>
              <Label htmlFor="title" className="text-xs uppercase tracking-wide text-muted-foreground">Title</Label>
              <Input
                id="title"
                placeholder="Give it a sharp title..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={200}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as PostCategory })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POST_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="content" className="text-xs uppercase tracking-wide text-muted-foreground">Body</Label>
            <Textarea
              id="content"
              placeholder="What's on your mind? Share details, screenshots links, what game, etc."
              rows={6}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              maxLength={5000}
              className="mt-1.5"
            />
            <div className="text-xs text-muted-foreground mt-1 text-right">{form.content.length} / 5000</div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={posting} className="bg-gradient-primary">
              {posting ? "Posting..." : "Publish thread"}
            </Button>
          </div>
        </form>
      )}

      {!user && (
        <div className="glass rounded-2xl p-6 mb-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-primary-glow hover:underline font-medium">Log in</Link> or{" "}
          <Link to="/signup" className="text-primary-glow hover:underline font-medium">create an account</Link> to start posting.
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
          {search || filter !== "all" ? "Nothing matches your filter." : "No posts yet. Be the first!"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const cat = getCategory(p.category);
            return (
              <Link
                key={p.id}
                to="/forums/$postId"
                params={{ postId: p.id }}
                className="block glass rounded-2xl p-5 shadow-card hover:shadow-glow hover:-translate-y-0.5 hover:border-primary/40 transition-all border border-transparent"
              >
                <div className="flex items-start gap-4">
                  <UserAvatar
                    username={p.author?.username ?? "?"}
                    avatarUrl={p.author?.avatar_url}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-[10px] font-bold uppercase tracking-wide border rounded-full px-2 py-0.5", cat.color)}>
                        {cat.label}
                      </span>
                      <h3 className="font-semibold text-base sm:text-lg truncate">{p.title}</h3>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.content}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span className="font-medium text-foreground">@{p.author?.username ?? "unknown"}</span>
                      <RoleBadge role={topRole(p.authorRoles)} />
                      <span>·</span>
                      <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {p.replyCount}</span>
                      <span>·</span>
                      <span>{new Date(p.created_at).toLocaleDateString()}</span>
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
