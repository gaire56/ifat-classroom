import { clearTeacherSession } from "@/lib/session";
export async function POST() {
  await clearTeacherSession();
  return Response.json({ ok: true });
}
