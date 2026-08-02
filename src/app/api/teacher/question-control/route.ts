import { z } from "zod";
import { requireTeacher } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { apiError, assertClassOwner } from "@/lib/authz";
import { emitClassEvent } from "@/lib/events";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("activate"), classId: z.string().uuid(), questionId: z.string().uuid() }),
  z.object({ action: z.literal("close"), classId: z.string().uuid(), questionId: z.string().uuid() }),
  z.object({ action: z.literal("reopen"), classId: z.string().uuid(), questionId: z.string().uuid() }),
  z.object({ action: z.literal("next"), classId: z.string().uuid(), questionId: z.string().uuid() }),
  z.object({ action: z.literal("resetGroup"), classId: z.string().uuid(), questionId: z.string().uuid(), groupId: z.string().uuid() }),
  z.object({ action: z.literal("resetAll"), classId: z.string().uuid(), questionId: z.string().uuid() })
]);

async function activateQuestion(classId: string, questionId: string) {
  const db = supabaseAdmin();

  const { data: target, error: targetError } = await db.from("questions")
    .select("id,class_id,class_day_id").eq("id", questionId).eq("class_id", classId).single();
  if (targetError) throw targetError;
  if (!target) throw new Error("Question not found.");

  const { error: closeError } = await db.from("questions")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("class_id", classId).eq("status", "active").neq("id", questionId);
  if (closeError) throw closeError;

  const { error: activateError } = await db.from("questions").update({
    status: "active",
    activated_at: new Date().toISOString(),
    closed_at: null
  }).eq("id", questionId).eq("class_id", classId);
  if (activateError) throw activateError;

  const { data: dayRow, error: dayError } = await db.from("class_days")
    .select("day_number").eq("id", target.class_day_id).single();
  if (dayError) throw dayError;
  await db.from("classes").update({ status: "active", current_day: dayRow.day_number }).eq("id", classId);
  await emitClassEvent(classId, "question_activated");
}

export async function POST(request: Request) {
  try {
    const teacher = await requireTeacher();
    const input = schema.parse(await request.json());
    await assertClassOwner(input.classId, teacher.teacherId);
    const db = supabaseAdmin();

    if (input.action === "activate" || input.action === "reopen") {
      await activateQuestion(input.classId, input.questionId);
      return Response.json({ ok: true });
    }

    if (input.action === "close") {
      const { error } = await db.from("questions").update({
        status: "closed", closed_at: new Date().toISOString()
      }).eq("id", input.questionId).eq("class_id", input.classId);
      if (error) throw error;
      await emitClassEvent(input.classId, "question_closed");
      return Response.json({ ok: true });
    }

    if (input.action === "next") {
      const { data: days, error: dayError } = await db.from("class_days")
        .select("id,day_number").eq("class_id", input.classId).order("day_number");
      if (dayError) throw dayError;
      const dayMap = new Map<string, number>((days ?? []).map((d: any) => [d.id, Number(d.day_number)]));
      const { data: qs, error: qError } = await db.from("questions")
        .select("id,class_day_id,question_number").eq("class_id", input.classId);
      if (qError) throw qError;
      const ordered = (qs ?? []).sort((a,b) =>
        (Number(dayMap.get(a.class_day_id) ?? 0) - Number(dayMap.get(b.class_day_id) ?? 0)) ||
        a.question_number - b.question_number
      );
      const idx = ordered.findIndex(q => q.id === input.questionId);
      const next = idx >= 0 ? ordered[idx + 1] : null;
      if (!next) return Response.json({ error: "There is no next question." }, { status: 400 });
      await activateQuestion(input.classId, next.id);
      return Response.json({ ok: true, questionId: next.id });
    }

    if (input.action === "resetGroup") {
      const { data: group } = await db.from("groups").select("id")
        .eq("id", input.groupId).eq("class_id", input.classId).maybeSingle();
      if (!group) throw new Error("Group not found in this class.");
      await db.from("attempts").delete().eq("question_id", input.questionId).eq("group_id", input.groupId);
      await db.from("question_results").delete().eq("question_id", input.questionId).eq("group_id", input.groupId);
      await emitClassEvent(input.classId, "group_attempt_reset");
      return Response.json({ ok: true });
    }

    if (input.action === "resetAll") {
      await db.from("attempts").delete().eq("question_id", input.questionId);
      await db.from("question_results").delete().eq("question_id", input.questionId);
      await emitClassEvent(input.classId, "all_attempts_reset");
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    return apiError(error);
  }
}
