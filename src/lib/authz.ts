import { supabaseAdmin } from "./supabase-admin";

export async function assertClassOwner(classId: string, teacherId: string) {
  const db = supabaseAdmin();
  const { data, error } = await db.from("classes").select("id").eq("id", classId).eq("teacher_id", teacherId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("FORBIDDEN");
}

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (message === "UNAUTHORIZED") return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (message === "FORBIDDEN") return Response.json({ error: "Forbidden" }, { status: 403 });
  return Response.json({ error: message }, { status: 400 });
}
