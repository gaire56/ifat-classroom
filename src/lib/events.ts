import { supabaseAdmin } from "./supabase-admin";

export async function emitClassEvent(classId: string, eventType: string) {
  const db = supabaseAdmin();
  await db.from("class_activity_events").insert({ class_id: classId, event_type: eventType });
}
