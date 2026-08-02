import { requireTeacher } from "@/lib/session";
import { assertClassOwner, apiError } from "@/lib/authz";
import { buildResults } from "@/lib/results";

export async function GET(request: Request) {
  try {
    const teacher = await requireTeacher();
    const classId = new URL(request.url).searchParams.get("classId");
    if (!classId) throw new Error("classId is required.");
    await assertClassOwner(classId, teacher.teacherId);
    const data = await buildResults(classId);

    const active = data.activeQuestion;
    const answered = active ? new Set(data.activeAttempts.map((a: any) => a.group_id)).size : 0;
    const totalGroups = data.groups.filter(g => g.is_active).length;
    const activeDay = active ? data.days.find(d => d.id === active.class_day_id)?.day_number ?? null : null;
    const leader = data.ranking[0] ?? null;
    const completedQuestions = data.questions.filter(q => q.status === "closed").length;

    return Response.json({
      class: data.classRow,
      currentDay: activeDay ?? data.classRow.current_day,
      activeQuestion: active ? active.question_number : null,
      activeQuestionId: active?.id ?? null,
      groupCount: totalGroups,
      answeredCount: answered,
      waitingCount: Math.max(totalGroups - answered, 0),
      leader: leader ? { groupName: leader.group_name, score: leader.finalTotal } : null,
      completedQuestions
    });
  } catch (error) {
    return apiError(error);
  }
}
