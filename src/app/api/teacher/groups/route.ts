import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireTeacher } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { apiError, assertClassOwner } from "@/lib/authz";
import { encryptCredential, randomLoginId, randomPassword } from "@/lib/credentials";
import { emitClassEvent } from "@/lib/events";
import { buildResults } from "@/lib/results";

const createSchema = z.object({ classId: z.string().uuid(), groupName: z.string().min(1).max(80) });
const patchSchema = z.object({
  classId: z.string().uuid(),
  groupId: z.string().uuid(),
  groupName: z.string().min(1).max(80).optional(),
  isActive: z.boolean().optional(),
  resetPassword: z.boolean().optional()
});
const deleteSchema = z.object({ classId: z.string().uuid(), groupId: z.string().uuid() });

export async function GET(request: Request) {
  try {
    const teacher = await requireTeacher();
    const classId = new URL(request.url).searchParams.get("classId");
    if (!classId) throw new Error("classId is required.");
    await assertClassOwner(classId, teacher.teacherId);
    const db = supabaseAdmin();
    const { data, error } = await db.from("groups")
      .select("id,group_name,login_id,is_active,last_login_at,created_at")
      .eq("class_id", classId).order("group_name");
    if (error) throw error;
    const resultData = await buildResults(classId);
    const scoreById = new Map(resultData.groupRows.map((g: any) => [g.id, g.finalTotal]));
    return Response.json({ groups: (data ?? []).map((g: any) => ({ ...g, total_score: scoreById.get(g.id) ?? 0 })) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const teacher = await requireTeacher();
    const input = createSchema.parse(await request.json());
    await assertClassOwner(input.classId, teacher.teacherId);

    const db = supabaseAdmin();
    const password = randomPassword();
    const loginId = randomLoginId();
    const passwordHash = await bcrypt.hash(password, 12);

    const { data, error } = await db.from("groups").insert({
      class_id: input.classId,
      group_name: input.groupName,
      login_id: loginId,
      password_hash: passwordHash,
      login_secret_enc: encryptCredential(password)
    }).select("id,group_name,login_id,is_active").single();
    if (error) throw error;
    await emitClassEvent(input.classId, "group_created");
    return Response.json({ group: data, password });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const teacher = await requireTeacher();
    const input = patchSchema.parse(await request.json());
    await assertClassOwner(input.classId, teacher.teacherId);

    const db = supabaseAdmin();
    const updates: Record<string, unknown> = {};
    let password: string | undefined;
    if (input.groupName !== undefined) updates.group_name = input.groupName;
    if (input.isActive !== undefined) updates.is_active = input.isActive;
    if (input.resetPassword) {
      password = randomPassword();
      updates.password_hash = await bcrypt.hash(password, 12);
      updates.login_secret_enc = encryptCredential(password);
      const { data: existing, error: existingError } = await db.from("groups")
        .select("auth_version").eq("id", input.groupId).eq("class_id", input.classId).single();
      if (existingError) throw existingError;
      updates.auth_version = Number(existing.auth_version) + 1;
    }

    const { data, error } = await db.from("groups").update(updates)
      .eq("id", input.groupId).eq("class_id", input.classId)
      .select("id,group_name,login_id,is_active").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("FORBIDDEN");
    await emitClassEvent(input.classId, input.resetPassword ? "group_password_reset" : "group_updated");
    return Response.json({ group: data, password });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    const teacher = await requireTeacher();
    const input = deleteSchema.parse(await request.json());
    await assertClassOwner(input.classId, teacher.teacherId);
    const db = supabaseAdmin();
    const { error } = await db.from("groups").delete().eq("id", input.groupId).eq("class_id", input.classId);
    if (error) throw error;
    await emitClassEvent(input.classId, "group_deleted");
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}
