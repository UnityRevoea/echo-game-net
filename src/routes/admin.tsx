import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Ban, Check, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const ROLE_OPTIONS: AppRole[] = ["user", "volunteer", "moderator", "admin"];

function AdminPage() {
  const { isAdmin, loading: authLoading, user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const toggleBan = async (u: UserRow) => {
    const { error } = await supabase.from("profiles").update({ banned: !u.banned }).eq("id", u.id);
    if (error) { toast.error(error.message); return; }
    toast.success(u.banned ? "User unbanned" : "User banned");
    load();
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
    load();
  };

  if (authLoading) return <main className="px-4 py-16 text-center text-muted-foreground">Loading...</main>;
  if (!user) return <main className="px-4 py-16 text-center">Please <Link to="/login" className="text-primary-glow underline">log in</Link>.</main>;
  if (!isAdmin) return <main className="px-4 py-16 text-center">Admins only.</main>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-bold inline-flex items-center gap-2">
        <Shield className="h-7 w-7 text-gold" /> Admin <span className="text-gradient">dashboard</span>
      </h1>
      <p className="mt-2 text-muted-foreground">{users.length} total users</p>

      <div className="mt-8 glass rounded-2xl overflow-hidden shadow-card">
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
            const primary: AppRole = u.roles.includes("admin")
              ? "admin"
              : u.roles.includes("moderator")
              ? "moderator"
              : u.roles.includes("volunteer")
              ? "volunteer"
              : "user";
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
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 text-right">
                  <Button
                    size="sm"
                    variant={u.banned ? "outline" : "destructive"}
                    onClick={() => toggleBan(u)}
                  >
                    {u.banned ? <><Check className="h-3 w-3 mr-1" /> Unban</> : <><Ban className="h-3 w-3 mr-1" /> Ban</>}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
