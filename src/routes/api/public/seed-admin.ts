import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const EMAIL = "josfeb2699@student.ccs.k12.nc.us";
const PASSWORD = "Josh1234";

export const Route = createFileRoute("/api/public/seed-admin")({
  server: {
    handlers: {
      GET: async () => {
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
        if (listErr) return new Response(JSON.stringify({ error: listErr.message }), { status: 500 });

        const existing = list.users.find((u) => u.email === EMAIL);
        let userId: string;

        if (existing) {
          const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
            password: PASSWORD,
            email_confirm: true,
          });
          if (updErr) return new Response(JSON.stringify({ error: updErr.message }), { status: 500 });
          userId = existing.id;
        } else {
          const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: EMAIL,
            password: PASSWORD,
            email_confirm: true,
            user_metadata: { username: "josfeb2699" },
          });
          if (createErr) return new Response(JSON.stringify({ error: createErr.message }), { status: 500 });
          userId = created.user!.id;
        }

        // ensure admin role
        await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

        return new Response(JSON.stringify({ ok: true, email: EMAIL, password: PASSWORD, userId }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
