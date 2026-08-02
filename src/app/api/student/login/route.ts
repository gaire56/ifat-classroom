import bcrypt from "bcryptjs";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { setGroupSession } from "@/lib/session";
import { emitClassEvent } from "@/lib/events";
import { apiError } from "@/lib/authz";

const schema = z.object({ loginId: z.string().min(2), password: z.string().min(4) });

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const db = supabaseAdmin();
    const { data: group, error } = await db.from("groups")
      .select("id,class_id,login_id,password_hash,is_active,auth_version")
      .eq("login_id", body.loginId.trim())
      .maybeSingle();

    if (error) throw error;
    if (!group || !group.is_active || !(await bcrypt.compare(body.password, group.password_hash))) {
      return Response.json({ error: "Invalid group ID or password." }, { status: 401 });
    }

    await db.from("groups").update({ last_login_at: new Date().toISOString() }).eq("id", group.id);
    await setGroupSession({ role: "group", groupId: group.id, classId: group.class_id, loginId: group.login_id, authVersion: group.auth_version });
    await emitClassEvent(group.class_id, "group_login");
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
