import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Calendar, Trophy, Ban, Camera, Clock, Save, Pencil, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { topRole, useAuth, type AppRole, type Profile } from "@/lib/auth";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteMyAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/profile/$username")({
  component: ProfilePage,
});

interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  awarded_at: string;
}

type ProfileExt = Profile;

function ProfilePage() {
  const { username } = Route.useParams();
  const { user, refresh, signOut } = useAuth();
  const navigate = useNavigate();
  const callDelete = useServerFn(deleteMyAccount);
  const [profile, setProfile] = useState<ProfileExt | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const doDelete = async () => {
    setDeleting(true);
    try {
      await callDelete();
      await signOut();
      toast.success("Account deleted");
      navigate({ to: "/" });
    } catch (e) {
      setDeleting(false);
      toast.error(e instanceof Error ? e.message : "Failed to delete account");
    }
  };

  const load = async () => {
    setLoading(true);
    const { data: p } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
    if (!p) { setProfile(null); setLoading(false); return; }
    setProfile(p as ProfileExt);
    setBioText(p.bio ?? "");

    const [{ data: r }, { data: ub }, { count }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", p.id),
      supabase
        .from("user_badges")
        .select("awarded_at, badges(id, name, description, icon, color)")
        .eq("user_id", p.id),
      supabase.from("forum_posts").select("*", { count: "exact", head: true }).eq("author_id", p.id),
    ]);

    setRoles((r ?? []).map((x: { role: AppRole }) => x.role));
    setBadges(
      (ub ?? [])
        .filter((x: { badges: unknown }) => x.badges)
        .map((x: { awarded_at: string; badges: { id: string; name: string; description: string; icon: string; color: string } }) => ({
          ...x.badges,
          awarded_at: x.awarded_at,
        })),
    );
    setPostCount(count ?? 0);
    setLoading(false);
  };

  useEffect(() => { load(); }, [username]);

  const isOwner = !!user && !!profile && user.id === profile.id;

  const onPickAvatar = () => fileRef.current?.click();

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user || !profile) return;
    if (!file.type.startsWith("image/")) { toast.error("Pick an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true, contentType: file.type,
    });
    if (upErr) { setUploading(false); toast.error(upErr.message); return; }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub.publicUrl;
    const { error: updErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setUploading(false);
    if (updErr) { toast.error(updErr.message); return; }
    toast.success("Profile picture updated");
    await refresh();
    load();
  };

  const saveBio = async () => {
    if (!user) return;
    setSavingBio(true);
    const { error } = await supabase.from("profiles").update({ bio: bioText.slice(0, 500) }).eq("id", user.id);
    setSavingBio(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bio saved");
    setEditingBio(false);
    await refresh();
    load();
  };

  if (loading) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Loading...</main>;
  if (!profile) return <main className="mx-auto max-w-3xl px-4 py-16 text-center">User not found.</main>;

  const isSuspended = profile.suspended_until && new Date(profile.suspended_until) > new Date();

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="glass rounded-3xl p-6 sm:p-8 shadow-card border border-border/60">
        <div className="flex items-start gap-6 flex-wrap">
          <div className="relative group">
            <UserAvatar username={profile.username} avatarUrl={profile.avatar_url} size="xl" className="ring-2 ring-primary/30 shadow-glow" />
            {isOwner && (
              <>
                <button
                  onClick={onPickAvatar}
                  disabled={uploading}
                  className="absolute inset-0 rounded-full flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium"
                >
                  <Camera className="h-5 w-5 mb-1" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">@{profile.username}</h1>
              <RoleBadge role={topRole(roles)} />
              {profile.banned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 text-destructive border border-destructive/40 px-2 py-0.5 text-[10px] font-bold uppercase">
                  <Ban className="h-3 w-3" /> Banned
                </span>
              )}
              {isSuspended && !profile.banned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold uppercase">
                  <Clock className="h-3 w-3" /> Suspended · until {new Date(profile.suspended_until!).toLocaleDateString()}
                </span>
              )}
            </div>

            {editingBio && isOwner ? (
              <div className="mt-3 space-y-2">
                <Textarea value={bioText} onChange={(e) => setBioText(e.target.value)} rows={3} maxLength={500} placeholder="Tell people who you are..." />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveBio} disabled={savingBio} className="bg-gradient-primary">
                    <Save className="h-3 w-3 mr-1" /> {savingBio ? "Saving..." : "Save"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingBio(false); setBioText(profile.bio ?? ""); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="mt-2 flex items-start gap-2">
                <p className="text-muted-foreground flex-1">{profile.bio || "No bio yet."}</p>
                {isOwner && (
                  <Button size="sm" variant="ghost" onClick={() => setEditingBio(true)} className="h-7 px-2 text-xs">
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" /> Joined {new Date(profile.created_at).toLocaleDateString()}</span>
              <span>· {postCount} posts</span>
              <span>· {badges.length} badges</span>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-bold mb-4 inline-flex items-center gap-2"><Trophy className="h-5 w-5 text-gold" /> Badges & Achievements</h2>
        {badges.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-muted-foreground text-sm">No badges yet — keep being awesome.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {badges.map((b) => (
              <div key={b.id} className="glass rounded-xl p-4 flex items-start gap-3 border border-border/40 hover:border-primary/40 transition-colors">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
                  <Trophy className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-semibold">{b.name}</div>
                  <div className="text-xs text-muted-foreground">{b.description}</div>
                  <div className="text-[10px] text-muted-foreground/70 mt-1">earned {new Date(b.awarded_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {isOwner && (
        <section className="mt-12 border-t border-destructive/30 pt-6">
          <h2 className="text-lg font-semibold text-destructive">Danger zone</h2>
          <p className="text-xs text-muted-foreground mt-1">Permanently delete your account, posts, replies, badges and roles. This cannot be undone.</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="mt-3">
                <Trash2 className="h-3 w-3 mr-1" /> Delete my account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes @{profile.username}, all your posts, replies, and badges. There's no going back.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={doDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
                  {deleting ? "Deleting..." : "Yes, delete forever"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      )}
    </main>
  );
}
