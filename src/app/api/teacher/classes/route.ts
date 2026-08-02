import { z } from "zod";
import { requireTeacher } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { apiError } from "@/lib/authz";
import { emitClassEvent } from "@/lib/events";

const createSchema = z.object({
  className: z.string().min(1).max(120),
  startDate: z.string().date(),
  endDate: z.string().date()
});

const patchSchema = z.object({
  classId: z.string().uuid(),
  className: z.string().min(1).max(120).optional(),
  status: z.enum(["draft","active","completed"]).optional(),
  currentDay: z.number().int().min(1).max(5).optional(),
  showStudentResults: z.boolean().optional()
});

export async function GET() {
  try {
    const teacher = await requireTeacher();
    const db = supabaseAdmin();
    const { data, error } = await db.from("classes").select("*").eq("teacher_id", teacher.teacherId).order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json({ classes: data });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await requireTeacher();
    const input = createSchema.parse(await request.json());
    if (input.endDate < input.startDate) return Response.json({ error: "End date must not be before start date." }, { status: 400 });

    const db = supabaseAdmin();
    const { data, error } = await db.from("classes").insert({
      teacher_id: teacher.teacherId,
      class_name: input.className,
      start_date: input.startDate,
      end_date: input.endDate
    }).select().single();
    if (error) throw error;
    return Response.json({ class: data });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const teacher = await requireTeacher();
    const input = patchSchema.parse(await request.json());
    const db = supabaseAdmin();
    const updates: Record<string, unknown> = {};
    if (input.className !== undefined) updates.class_name = input.className;
    if (input.status !== undefined) updates.status = input.status;
    if (input.currentDay !== undefined) updates.current_day = input.currentDay;
    if (input.showStudentResults !== undefined) updates.show_student_results = input.showStudentResults;

    const { data, error } = await db.from("classes").update(updates)
      .eq("id", input.classId).eq("teacher_id", teacher.teacherId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("FORBIDDEN");
    await emitClassEvent(input.classId, "class_updated");
    return Response.json({ class: data });
  } catch (error) {
    return apiError(error);
  }
}


export async function DELETE(request: Request) {
  try {
    const teacher = await requireTeacher();
    const body = z.object({ classId: z.string().uuid() }).parse(await request.json());
    const db = supabaseAdmin();
    const { data, error } = await db.from("classes").delete()
      .eq("id", body.classId).eq("teacher_id", teacher.teacherId)
      .select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("FORBIDDEN");
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
