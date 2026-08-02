import { clearGroupSession } from "@/lib/session";
export async function POST() {
  await clearGroupSession();
  return Response.json({ ok: true });
}
