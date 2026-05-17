import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    // Clean up user-authored content (RLS-free admin)
    await supabaseAdmin.from("forum_replies").delete().eq("author_id", userId);
    await supabaseAdmin.from("forum_posts").delete().eq("author_id", userId);
    await supabaseAdmin.from("user_badges").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("reports").delete().eq("reporter_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
