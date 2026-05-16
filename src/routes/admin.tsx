import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Ban, Check, Shield, Flag, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — UnityRevoea" }] }),
});

interface UserRow {
  id: string;
  username: string;
  email: string;
  banned: boolean;
  created_at: string;
  roles: AppRole[];
}

type ReportStatus = "open" | "resolved" | "dismissed";
type ReportTarget = "post" | "reply" | "user";

interface ReportRow {
  id: string;
  reporter_id: string;
  target_type: ReportTarget;
  target_id: string;
  reason: string;
  status: ReportStatus;
  resolution_notes: string | null;
  created_at: string;
  reporterName?: string;
  targetSummary?: string;
}

const ROLE_OPTIONS: AppRole[] = ["user", "volunteer", "moderator", "admin"];

function AdminPage() {
  const { isAdmin, isStaff, loading: authLoading, user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("open");

  const loadUsers = async () => {
    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleMap = new Map<string, AppRole[]>();
    (roles ?? []).forEach((r) => {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role as AppRole);
      roleMap.set(r.user_id, arr);
    });
    setUsers((profs ?? []).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] })));
  };

  const loadReports = async () => {
    let q = supabase.from("reports").select("*").order("created_at", { ascending: false });
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data: rs } = await q;
    const list = (rs ?? []) as ReportRow[];

    const reporterIds = [...new Set(list.map((r) => r.reporter_id))];
    const postIds = list.filter((r) => r.target_type === "post").map((r) => r.target_id);
    const replyIds = list.filter((r) => r.target_type === "reply").map((r) => r.target_id);
    const userIds = list.filter((r) => r.target_type === "user").map((r) => r.target_id);

    const [{ data: reporters }, { data: posts }, { data: replies }, { data: targetUsers }] = await Promise.all([
      reporterIds.length ? supabase.from("profiles").select("id, username").in("id", reporterIds) : Promise.resolve({ data: [] as any[] }),
      postIds.length ? supabase.from("forum_posts").select("id, title").in("id", postIds) : Promise.resolve({ data: [] as any[] }),
      replyIds.length ? supabase.from("forum_replies").select("id, content, post_id").in("id", replyIds) : Promise.resolve({ data: [] as any[] }),
      userIds.length ? supabase.from("profiles").select("id, username").in("id", userIds) : Promise.resolve({ data: [] as any[] }),
    ]);

    const rMap = new Map((reporters ?? []).map((p: any) => [p.id, p.username]));
    const pMap = new Map((posts ?? []).map((p: any) => [p.id, p.title]));
    const repMap = new Map((replies ?? []).map((p: any) => [p.id, p.content]));
    const uMap = new Map((targetUsers ?? []).map((p: any) => [p.id, p.username]));

    setReports(list.map((r) => ({
      ...r,
      reporterName: rMap.get(r.reporter_id) ?? "unknown",
      targetSummary:
        r.target_type === "post" ? (pMap.get(r.target_id) ?? "[deleted post]") :
        r.target_type === "reply" ? (repMap.get(r.target_id)?.slice(0, 80) ?? "[deleted reply]") :
        `@${uMap.get(r.target_id) ?? "unknown"}`,
    })));
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([isAdmin ? loadUsers() : Promise.resolve(), loadReports()]);
    setLoading(false);
  };

  useEffect(() => { if (isStaff) loadAll(); /* eslint-disable-next-line */ }, [isStaff, statusFilter]);

  const toggleBan = async (u: UserRow) => {
    const { error } = await supabase.from("profiles").update({ banned: !u.banned }).eq("id", u.id);
    if (error) { toast.error(error.message); return; }
    toast.success(u.banned ? "User unbanned" : "User banned");
    loadUsers();
  };

  const assignRole = async (u: UserRow, role: AppRole) => {
    const toRemove = u.roles.filter((r) => r !== "user");
    if (toRemove.length) {
      await supabase.from("user_roles").delete().eq("user_id", u.id).in("role", toRemove);
    }
    if (role !== "user") {
      const { error } = await supabase.from("user_roles").insert({ user_id: u.id, role });
      if (error) { toast.error(error.message); return; }
    }
    toast.success(`Role updated to ${role}`);
    loadUsers();
  };

  const setReportStatus = async (r: ReportRow, status: ReportStatus) => {
    const { error } = await supabase.from("reports").update({ status, resolver_id: user!.id }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Report ${status}`);
    loadReports();
  };

  const deleteReport = async (r: ReportRow) => {
    const { error } = await supabase.from("reports").delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Report deleted");
    loadReports();
  };

  const deleteTarget = async (r: ReportRow) => {
    if (r.target_type === "post") {
      await supabase.from("forum_posts").delete().eq("id", r.target_id);
    } else if (r.target_type === "reply") {
      await supabase.from("forum_replies").delete().eq("id", r.target_id);
    } else {
      toast.error("Use the Users tab to ban this user");
      return;
    }
    await setReportStatus(r, "resolved");
    toast.success("Content removed");
  };

  if (authLoading) return <main className="px-4 py-16 text-center text-muted-foreground">Loading...</main>;
  if (!user) return <main className="px-4 py-16 text-center">Please <Link to="/login" className="text-primary-glow underline">log in</Link>.</main>;
  if (!isStaff) return <main className="px-4 py-16 text-center">Staff only.</main>;

  const openCount = reports.filter((r) => r.status === "open").length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-bold inline-flex items-center gap-2">
        <Shield className="h-7 w-7 text-gold" /> Staff <span className="text-gradient">center</span>
      </h1>
      <p className="mt-2 text-muted-foreground">Manage your community.</p>

      <Tabs defaultValue={isAdmin ? "users" : "reports"} className="mt-8">
        <TabsList>
          {isAdmin && <TabsTrigger value="users">Users ({users.length})</TabsTrigger>}
          <TabsTrigger value="reports" className="gap-2">
            <Flag className="h-3 w-3" /> Reports
            {statusFilter === "open" && openCount > 0 && <Badge variant="destructive" className="ml-1">{openCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        {isAdmin && (
          <TabsContent value="users">
            <div className="glass rounded-2xl overflow-hidden shadow-card">
              <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-border/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <div className="col-span-3">User</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-2">Joined</div>
                <div className="col-span-2">Role</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : (
                users.map((u) => {
                  const primary: AppRole = u.roles.includes("admin") ? "admin"
                    : u.roles.includes("moderator") ? "moderator"
                    : u.roles.includes("volunteer") ? "volunteer" : "user";
                  return (
                    <div key={u.id} className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-border/30 items-center text-sm">
                      <div className="col-span-3 flex items-center gap-2">
                        <Link to="/profile/$username" params={{ username: u.username }} className="font-medium hover:text-primary-glow">
                          @{u.username}
                        </Link>
                        {u.banned && <Ban className="h-3 w-3 text-destructive" />}
                      </div>
                      <div className="col-span-3 text-muted-foreground truncate">{u.email}</div>
                      <div className="col-span-2 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</div>
                      <div className="col-span-2">
                        <Select value={primary} onValueChange={(v) => assignRole(u, v as AppRole)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 text-right">
                        <Button size="sm" variant={u.banned ? "outline" : "destructive"} onClick={() => toggleBan(u)}>
                          {u.banned ? <><Check className="h-3 w-3 mr-1" /> Unban</> : <><Ban className="h-3 w-3 mr-1" /> Ban</>}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
        )}

        <TabsContent value="reports">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filter:</span>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : reports.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center text-muted-foreground">No reports here.</div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="glass rounded-2xl p-5 shadow-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="uppercase text-xs">{r.target_type}</Badge>
                        <Badge variant={r.status === "open" ? "destructive" : "secondary"}>{r.status}</Badge>
                        <span className="text-xs text-muted-foreground">
                          reported by <span className="text-foreground font-medium">@{r.reporterName}</span> · {new Date(r.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="text-muted-foreground">Target: </span>
                        {r.target_type === "post" ? (
                          <Link to="/forums/$postId" params={{ postId: r.target_id }} className="text-primary-glow hover:underline">
                            {r.targetSummary}
                          </Link>
                        ) : (
                          <span className="font-medium">{r.targetSummary}</span>
                        )}
                      </div>
                      <p className="mt-2 text-sm whitespace-pre-wrap"><span className="text-muted-foreground">Reason: </span>{r.reason}</p>
                    </div>
                  </div>

                  {r.status === "open" && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => setReportStatus(r, "resolved")} className="bg-gradient-primary">
                        <Check className="h-3 w-3 mr-1" /> Mark resolved
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setReportStatus(r, "dismissed")}>
                        Dismiss
                      </Button>
                      {(r.target_type === "post" || r.target_type === "reply") && (
                        <Button size="sm" variant="destructive" onClick={() => deleteTarget(r)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Delete {r.target_type}
                        </Button>
                      )}
                    </div>
                  )}
                  {isAdmin && (
                    <div className="mt-2">
                      <Button size="sm" variant="ghost" onClick={() => deleteReport(r)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3 mr-1" /> Delete report
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
