import { requireGroup } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { apiError } from "@/lib/authz";

export async function GET() {
  try {
    const session = await requireGroup();
    const db = supabaseAdmin();

    const { data: group, error: groupError } = await db.from("groups")
      .select("id,group_name,class_id,is_active,auth_version").eq("id", session.groupId).single();
    if (groupError) throw groupError;
    if (!group?.is_active) return Response.json({ error: "Group account is inactive." }, { status: 403 });
    if (group.auth_version !== session.authVersion) return Response.json({ error: "Session expired after a credential change. Please log in again." }, { status: 401 });

    const { data: classRow, error: classError } = await db.from("classes")
      .select("id,class_name,status,show_student_results").eq("id", group.class_id).single();
    if (classError) throw classError;

    const { data: active, error: activeError } = await db.from("questions")
      .select("id,class_day_id,question_number,status")
      .eq("class_id", group.class_id).eq("status", "active").maybeSingle();
    if (activeError) throw activeError;

    let activeQuestion: any = null;
    let attempts: unknown[] = [];
    let result: any = null;

    if (active) {
      const { data: day, error: dayError } = await db.from("class_days")
        .select("day_number").eq("id", active.class_day_id).single();
      if (dayError) throw dayError;
      activeQuestion = {
        id: active.id,
        dayNumber: day.day_number,
        questionNumber: active.question_number,
        status: active.status
      };

      const [{ data: attemptRows, error: ae }, { data: resultRow, error: re }] = await Promise.all([
        db.from("attempts")
          .select("selected_option,attempt_number,is_correct,points_awarded,created_at")
          .eq("question_id", active.id).eq("group_id", group.id).order("attempt_number"),
        db.from("question_results")
          .select("attempt_count,completed,points,completed_at")
          .eq("question_id", active.id).eq("group_id", group.id).maybeSingle()
      ]);
      if (ae) throw ae;
      if (re) throw re;
      attempts = attemptRows ?? [];
      result = resultRow;
    }

    let final: any = null;
    if (classRow.status === "completed" && classRow.show_student_results) {
      const { data: allResults, error: rr } = await db.from("question_results")
        .select("group_id,points,question_id").eq("group_id", group.id).eq("completed", true);
      if (rr) throw rr;
      const finalScore = (allResults ?? []).reduce((sum, r) => sum + r.points, 0);

      const { data: classGroups, error: cg } = await db.from("groups").select("id").eq("class_id", group.class_id);
      if (cg) throw cg;
      const groupIds = (classGroups ?? []).map(g => g.id);
      const { data: classResults, error: cr } = groupIds.length
        ? await db.from("question_results").select("group_id,points").in("group_id", groupIds).eq("completed", true)
        : { data: [], error: null };
      if (cr) throw cr;
      const totals = new Map<string, number>();
      for (const id of groupIds) totals.set(id, 0);
      for (const r of classResults ?? []) totals.set(r.group_id, (totals.get(r.group_id) ?? 0) + r.points);
      const sorted = [...totals.entries()].sort((a,b) => b[1] - a[1]);
      const targetIndex = sorted.findIndex(([id]) => id === group.id);
      const targetScore = finalScore;
      const rank = targetIndex < 0 ? 1 : 1 + sorted.filter(([, score]) => score > targetScore).length;
      final = { score: finalScore, rank };
    }

    return Response.json({
      classId: classRow.id,
      className: classRow.class_name,
      classStatus: classRow.status,
      showStudentResults: classRow.show_student_results,
      groupName: group.group_name,
      activeQuestion,
      attempts,
      result,
      final
    });
  } catch (error) {
    return apiError(error);
  }
}
