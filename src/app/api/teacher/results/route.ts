import { requireTeacher } from "@/lib/session";
import { assertClassOwner, apiError } from "@/lib/authz";
import { buildResults } from "@/lib/results";

export async function GET(request: Request) {
  try {
    const teacher = await requireTeacher();
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");
    if (!classId) throw new Error("classId is required.");
    await assertClassOwner(classId, teacher.teacherId);
    const data = await buildResults(classId);

    const dayById = new Map(data.days.map(d => [d.id, d.day_number]));
    const currentQuestionRows = data.activeQuestion
      ? data.groups.map(group => {
          const attempts = data.activeAttempts.filter(a => a.group_id === group.id);
          const result = data.activeResults.find(r => r.group_id === group.id);
          return {
            groupId: group.id,
            groupName: group.group_name,
            scratchedOptions: attempts.map(a => a.selected_option),
            attempts: attempts.length,
            status: result?.completed ? "Correct" : attempts.length ? "Still answering" : "Waiting",
            points: result?.completed ? result.points : null
          };
        })
      : [];

    return Response.json({
      class: data.classRow,
      days: data.days,
      questions: data.questions.map(q => ({
        id: q.id,
        dayNumber: dayById.get(q.class_day_id),
        questionNumber: q.question_number,
        status: q.status
      })),
      currentQuestion: data.activeQuestion
        ? {
            id: data.activeQuestion.id,
            dayNumber: dayById.get(data.activeQuestion.class_day_id),
            questionNumber: data.activeQuestion.question_number
          }
        : null,
      currentQuestionRows,
      groupRows: data.groupRows,
      ranking: data.ranking
    });
  } catch (error) {
    return apiError(error);
  }
}
