import { z } from "zod";
import { requireTeacher } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { apiError, assertClassOwner } from "@/lib/authz";

const createSchema = z.object({
  classId: z.string().uuid(),
  dayNumber: z.number().int().min(1).max(5),
  questionNumber: z.number().int().positive(),
  correctOption: z.enum(["A","B","C","D"])
});
const patchSchema = z.object({
  classId: z.string().uuid(),
  questionId: z.string().uuid(),
  questionNumber: z.number().int().positive().optional(),
  correctOption: z.enum(["A","B","C","D"]).optional()
});

export async function GET(request: Request) {
  try {
    const teacher = await requireTeacher();
    const classId = new URL(request.url).searchParams.get("classId");
    if (!classId) throw new Error("classId is required.");
    await assertClassOwner(classId, teacher.teacherId);
    const db = supabaseAdmin();
    const { data: days, error: de } = await db.from("class_days").select("*").eq("class_id", classId).order("day_number");
    if (de) throw de;
    const { data: questions, error: qe } = await db.from("questions")
      .select("id,class_id,class_day_id,question_number,correct_option,status,activated_at,closed_at")
      .eq("class_id", classId);
    if (qe) throw qe;
    return Response.json({ days, questions });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const teacher = await requireTeacher();
    const input = createSchema.parse(await request.json());
    await assertClassOwner(input.classId, teacher.teacherId);
    const db = supabaseAdmin();
    const { data: day, error: dayError } = await db.from("class_days").select("id")
      .eq("class_id", input.classId).eq("day_number", input.dayNumber).single();
    if (dayError) throw dayError;
    const { data, error } = await db.from("questions").insert({
      class_id: input.classId,
      class_day_id: day.id,
      question_number: input.questionNumber,
      correct_option: input.correctOption
    }).select().single();
    if (error) throw error;
    return Response.json({ question: data });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const teacher = await requireTeacher();
    const input = patchSchema.parse(await request.json());
    await assertClassOwner(input.classId, teacher.teacherId);
    const db = supabaseAdmin();
    const updates: Record<string, unknown> = {};
    if (input.questionNumber !== undefined) updates.question_number = input.questionNumber;
    if (input.correctOption !== undefined) updates.correct_option = input.correctOption;
    const { data, error } = await db.from("questions").update(updates)
      .eq("id", input.questionId).eq("class_id", input.classId)
      .select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("FORBIDDEN");
    return Response.json({ question: data });
  } catch (error) { return apiError(error); }
}
