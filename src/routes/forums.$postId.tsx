import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, UserX, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, topRole, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RoleBadge } from "@/components/RoleBadge";
import { ReportButton } from "@/components/ReportButton";
import { UserAvatar } from "@/components/UserAvatar";
import { FormatToolbar } from "@/components/FormatToolbar";
import { getCategory } from "@/lib/forum-constants";
import { PostBody, splitContentWarning } from "@/lib/markdown";
import { useBlockedUsers } from "@/lib/blocked";
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
  const { isBlocked, block, unblock } = useBlockedUsers();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

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
    if (content.trim().length < 2) { toast.error("Say a bit more..."); return; }
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
  const { warning: postCW, body: postBody } = splitContentWarning(post.content);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/community" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to forums
      </Link>

      <article className="surface rounded-2xl p-6 sm:p-8 shadow-card">
        <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide border rounded-full px-2 py-0.5", cat.chip)}>
          <span className={cn("h-1 w-1 rounded-full", cat.dot)} />
          {cat.label}
        </span>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold leading-tight tracking-tight">{post.title}</h1>
        <div className="mt-5 flex items-center gap-3">
          <UserAvatar username={post.authorName} avatarUrl={post.authorAvatar} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <Link to="/profile/$username" params={{ username: post.authorName }} className="font-semibold text-foreground hover:text-primary-glow">
                @{post.authorName}
              </Link>
              <RoleBadge role={topRole(post.authorRoles)} />
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 font-mono">{new Date(post.created_at).toLocaleString()}</div>
          </div>
          {user && user.id !== post.author_id && (
            <button
              onClick={() => {
                if (isBlocked(post.author_id)) { unblock(post.author_id); toast.success(`Unblocked @${post.authorName}`); }
                else { block(post.author_id); toast.success(`Blocked @${post.authorName} — their posts are hidden`); }
              }}
              title={isBlocked(post.author_id) ? "Unblock" : "Block user"}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-accent/50"
            >
              {isBlocked(post.author_id) ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
            </button>
          )}
          <ReportButton targetType="post" targetId={post.id} size="xs" />
        </div>
        <div className="mt-6">
          <PostBody content={postBody} contentWarning={postCW} />
        </div>
      </article>

      <div className="mt-10 mb-4 flex items-center gap-3">
        <h2 className="font-semibold text-lg">
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </h2>
        <div className="flex-1 hairline" />
      </div>

      <div className="space-y-2">
        {replies.map((r) => {
          if (isBlocked(r.author_id)) {
            return (
              <div key={r.id} className="surface rounded-xl px-4 py-3 text-xs text-muted-foreground italic">
                Reply from blocked user hidden ·{" "}
                <button className="underline" onClick={() => { unblock(r.author_id); toast.success("Unblocked"); }}>show</button>
              </div>
            );
          }
          const { warning, body } = splitContentWarning(r.content);
          return (
            <div key={r.id} className="surface rounded-xl p-4">
              <div className="flex items-start gap-3">
                <UserAvatar username={r.authorName} avatarUrl={r.authorAvatar} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <Link to="/profile/$username" params={{ username: r.authorName }} className="font-semibold text-foreground hover:text-primary-glow">
                      @{r.authorName}
                    </Link>
                    <RoleBadge role={topRole(r.authorRoles)} />
                    <span className="text-muted-foreground/60 font-mono">· {new Date(r.created_at).toLocaleString()}</span>
                    <span className="ml-auto inline-flex items-center gap-1">
                      {user && user.id !== r.author_id && (
                        <button
                          onClick={() => { block(r.author_id); toast.success(`Blocked @${r.authorName}`); }}
                          title="Block user"
                          className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent/50"
                        >
                          <UserX className="h-3 w-3" />
                        </button>
                      )}
                      <ReportButton targetType="reply" targetId={r.id} size="xs" />
                    </span>
                  </div>
                  <div className="mt-2">
                    <PostBody content={body} contentWarning={warning} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {user ? (
        <form onSubmit={reply} className="mt-6 surface rounded-2xl overflow-hidden shadow-card">
          <div className="flex items-start gap-3 p-4">
            <UserAvatar username={profile?.username ?? "?"} avatarUrl={profile?.avatar_url} size="sm" />
            <div className="flex-1 rounded-lg border border-input bg-input/30 overflow-hidden">
              <FormatToolbar textareaRef={taRef} value={content} onChange={setContent} />
              <Textarea
                ref={taRef}
                placeholder="Write a reply... (markdown supported)"
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={3000}
                className="border-0 rounded-none focus-visible:ring-0 font-mono text-sm"
              />
            </div>
          </div>
          <div className="flex justify-between items-center px-4 pb-4">
            <span className="text-[10px] text-muted-foreground font-mono">{content.length}/3000</span>
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
