import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, topRole, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RoleBadge } from "@/components/RoleBadge";
import { ReportButton } from "@/components/ReportButton";

export const Route = createFileRoute("/community")({
  component: Community,
  head: () => ({ meta: [{ title: "Community Forums — UnityRevoea" }] }),
});

interface PostRow {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_id: string;
  author?: { username: string; banned: boolean };
  authorRoles: AppRole[];
  replyCount: number;
}

function Community() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "" });
  const [posting, setPosting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: rawPosts } = await supabase
      .from("forum_posts")
      .select("id, title, content, created_at, author_id")
      .order("created_at", { ascending: false })
      .limit(50);

    const list = rawPosts ?? [];
    const authorIds = [...new Set(list.map((p) => p.author_id))];
    const postIds = list.map((p) => p.id);

    const [{ data: profs }, { data: roles }, { data: replies }] = await Promise.all([
      authorIds.length
        ? supabase.from("profiles").select("id, username, banned").in("id", authorIds)
        : Promise.resolve({ data: [] as { id: string; username: string; banned: boolean }[] }),
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
    if (!form.title.trim() || !form.content.trim()) { toast.error("Title and content required"); return; }
    setPosting(true);
    const { error } = await supabase.from("forum_posts").insert({
      author_id: user.id,
      title: form.title.trim().slice(0, 200),
      content: form.content.trim().slice(0, 5000),
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Posted!");
    setForm({ title: "", content: "" });
    setShowForm(false);
    load();
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold">Community <span className="text-gradient">forums</span></h1>
          <p className="mt-2 text-muted-foreground">Post, reply, hang out.</p>
        </div>
        {user && (
          <Button onClick={() => setShowForm((v) => !v)} className="bg-gradient-primary shadow-glow">
            <Plus className="h-4 w-4 mr-1" /> New post
          </Button>
        )}
      </div>

      {showForm && user && (
        <form onSubmit={submit} className="glass rounded-2xl p-6 mb-6 space-y-3">
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} />
          <Textarea placeholder="What's on your mind?" rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} maxLength={5000} />
          <Button type="submit" disabled={posting} className="bg-gradient-primary">
            {posting ? "Posting..." : "Post"}
          </Button>
        </form>
      )}

      {!user && (
        <div className="glass rounded-2xl p-6 mb-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-primary-glow hover:underline">Log in</Link> to start posting.
        </div>
      )}

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-muted-foreground">No posts yet. Be the first!</div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Link
              key={p.id}
              to="/forums/$postId"
              params={{ postId: p.id }}
              className="block glass rounded-2xl p-5 shadow-card hover:shadow-glow hover:-translate-y-0.5 transition-all"
            >
              <h3 className="font-semibold text-lg">{p.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.content}</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span>by</span>
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
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
