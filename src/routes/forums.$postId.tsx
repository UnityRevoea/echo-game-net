import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, topRole, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RoleBadge } from "@/components/RoleBadge";
import { ReportButton } from "@/components/ReportButton";
import { UserAvatar } from "@/components/UserAvatar";
import { getCategory } from "@/lib/forum-constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/forums/$postId")({
  component: PostDetail,
});

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  author_id: string;
  authorName: string;
  authorAvatar: string | null;
  authorRoles: AppRole[];
}
interface Reply {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  authorName: string;
  authorAvatar: string | null;
  authorRoles: AppRole[];
}

function PostDetail() {
  const { postId } = Route.useParams();
  const { user, profile } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const enrich = async <T extends { author_id: string }>(rows: T[]) => {
    const ids = [...new Set(rows.map((r) => r.author_id))];
    if (!ids.length) return new Map<string, { username: string; avatar_url: string | null; roles: AppRole[] }>();
    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, username, avatar_url").in("id", ids),
      supabase.from("user_roles").select("user_id, role").in("user_id", ids),
    ]);
    const roleMap = new Map<string, AppRole[]>();
    (roles ?? []).forEach((r) => {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });
    return new Map(
      (profs ?? []).map((p) => [p.id, { username: p.username, avatar_url: p.avatar_url, roles: roleMap.get(p.id) ?? [] }]),
    );
  };

  const load = async () => {
    setLoading(true);
    const { data: p } = await supabase.from("forum_posts").select("*").eq("id", postId).maybeSingle();
    const { data: r } = await supabase.from("forum_replies").select("*").eq("post_id", postId).order("created_at", { ascending: true });

    const all = [...(p ? [{ author_id: p.author_id }] : []), ...(r ?? []).map((x) => ({ author_id: x.author_id }))];
    const map = await enrich(all);

    if (p) {
      const m = map.get(p.author_id);
      setPost({
        ...p,
        authorName: m?.username ?? "unknown",
        authorAvatar: m?.avatar_url ?? null,
        authorRoles: m?.roles ?? [],
      });
    }
    setReplies((r ?? []).map((x) => {
      const m = map.get(x.author_id);
      return {
        ...x,
        authorName: m?.username ?? "unknown",
        authorAvatar: m?.avatar_url ?? null,
        authorRoles: m?.roles ?? [],
      };
    }));
    setLoading(false);
  };

  useEffect(() => { load(); }, [postId]);

  const reply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Log in to reply"); return; }
    if (profile?.banned) { toast.error("Your account is banned"); return; }
    if (!content.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("forum_replies").insert({
      post_id: postId,
      author_id: user.id,
      content: content.trim().slice(0, 3000),
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    setContent("");
    load();
  };

  if (loading) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Loading...</main>;
  if (!post) return <main className="mx-auto max-w-3xl px-4 py-16 text-center">Post not found.</main>;
  const cat = getCategory(post.category);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/community" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to forums
      </Link>

      <article className="glass rounded-2xl p-6 shadow-card border border-border/60">
        <span className={cn("inline-block text-[10px] font-bold uppercase tracking-wide border rounded-full px-2 py-0.5", cat.color)}>
          {cat.label}
        </span>
        <h1 className="mt-3 text-2xl sm:text-3xl font-bold leading-tight">{post.title}</h1>
        <div className="mt-4 flex items-center gap-3">
          <UserAvatar username={post.authorName} avatarUrl={post.authorAvatar} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <Link to="/profile/$username" params={{ username: post.authorName }} className="font-semibold text-foreground hover:text-primary-glow">
                @{post.authorName}
              </Link>
              <RoleBadge role={topRole(post.authorRoles)} />
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{new Date(post.created_at).toLocaleString()}</div>
          </div>
          <ReportButton targetType="post" targetId={post.id} size="xs" />
        </div>
        <p className="mt-5 whitespace-pre-wrap leading-relaxed text-[15px]">{post.content}</p>
      </article>

      <h2 className="mt-10 mb-4 font-semibold text-lg">
        {replies.length} {replies.length === 1 ? "reply" : "replies"}
      </h2>

      <div className="space-y-3">
        {replies.map((r) => (
          <div key={r.id} className="glass rounded-xl p-4 border border-border/40">
            <div className="flex items-start gap-3">
              <UserAvatar username={r.authorName} avatarUrl={r.authorAvatar} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <Link to="/profile/$username" params={{ username: r.authorName }} className="font-semibold text-foreground hover:text-primary-glow">
                    @{r.authorName}
                  </Link>
                  <RoleBadge role={topRole(r.authorRoles)} />
                  <span className="text-muted-foreground">· {new Date(r.created_at).toLocaleString()}</span>
                  <span className="ml-auto"><ReportButton targetType="reply" targetId={r.id} size="xs" /></span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{r.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {user ? (
        <form onSubmit={reply} className="mt-6 glass rounded-2xl p-4 space-y-3 border border-border/60">
          <div className="flex items-start gap-3">
            <UserAvatar username={profile?.username ?? "?"} avatarUrl={profile?.avatar_url} size="sm" />
            <Textarea placeholder="Write a reply..." rows={3} value={content} onChange={(e) => setContent(e.target.value)} maxLength={3000} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={posting} className="bg-gradient-primary">
              {posting ? "Posting..." : "Reply"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-primary-glow hover:underline">Log in</Link> to reply.
        </div>
      )}
    </main>
  );
}
