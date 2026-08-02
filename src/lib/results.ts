import { supabaseAdmin } from "./supabase-admin";

export async function buildResults(classId: string) {
  const db = supabaseAdmin();

  const [{ data: classRow, error: classError }, { data: groups, error: groupError }, { data: days, error: dayError }, { data: questions, error: questionError }] =
    await Promise.all([
      db.from("classes").select("*").eq("id", classId).single(),
      db.from("groups").select("id,group_name,login_id,is_active,last_login_at").eq("class_id", classId).order("group_name"),
      db.from("class_days").select("id,day_number,date,status").eq("class_id", classId).order("day_number"),
      db.from("questions").select("id,class_day_id,question_number,status,activated_at,closed_at").eq("class_id", classId)
    ]);

  if (classError) throw classError;
  if (groupError) throw groupError;
  if (dayError) throw dayError;
  if (questionError) throw questionError;

  const questionIds = (questions ?? []).map(q => q.id);
  const { data: results, error: resultError } = questionIds.length
    ? await db.from("question_results").select("*").in("question_id", questionIds)
    : { data: [], error: null };
  if (resultError) throw resultError;

  const { data: attempts, error: attemptError } = questionIds.length
    ? await db.from("attempts").select("*").in("question_id", questionIds).order("created_at")
    : { data: [], error: null };
  if (attemptError) throw attemptError;

  const dayById = new Map<string, number>(
  (days ?? []).map(
    (d: any): [string, number] => [d.id, Number(d.day_number)]
  )
);

const questionById = new Map<string, any>(
  (questions ?? []).map(
    (q: any): [string, any] => [q.id, q]
  )
);

const resultMap = new Map<string, any>(
  (results ?? []).map(
    (r: any): [string, any] => [
      `${r.question_id}:${r.group_id}`,
      r
    ]
  )
);

  const groupRows = (groups ?? []).map(g => {
    const dayTotals: Record<number, number> = {1:0,2:0,3:0,4:0,5:0};
    const questionScores: Record<string, number | null> = {};
    for (const q of questions ?? []) {
      const result = resultMap.get(`${q.id}:${g.id}`);
      const dayNumber = dayById.get(q.class_day_id) as number;
      questionScores[`${dayNumber}-${q.question_number}`] = result?.completed ? result.points : null;
      if (result?.completed) dayTotals[dayNumber] += result.points;
    }
    const finalTotal = Object.values(dayTotals).reduce((a,b) => a + b, 0);
    return { ...g, dayTotals, questionScores, finalTotal };
  });

  const sorted = [...groupRows].sort((a,b) => b.finalTotal - a.finalTotal || a.group_name.localeCompare(b.group_name));
  let previousScore: number | null = null;
  let previousRank = 0;
  const ranking = sorted.map((g, index) => {
    const rank = previousScore === g.finalTotal ? previousRank : index + 1;
    previousScore = g.finalTotal;
    previousRank = rank;
    return { rank, ...g };
  });

  const activeQuestion = (questions ?? []).find(q => q.status === "active") ?? null;
  const activeAttempts = activeQuestion
    ? (attempts ?? []).filter(a => a.question_id === activeQuestion.id)
    : [];
  const activeResults = activeQuestion
    ? (results ?? []).filter(r => r.question_id === activeQuestion.id)
    : [];

  return {
    classRow,
    groups: groups ?? [],
    days: days ?? [],
    questions: (questions ?? []).sort((a,b) => {
      const da = Number(dayById.get(a.class_day_id) ?? 0);
      const dbn = Number(dayById.get(b.class_day_id) ?? 0);
      return da - dbn || a.question_number - b.question_number;
    }),
    results: results ?? [],
    attempts: attempts ?? [],
    groupRows,
    ranking,
    activeQuestion,
    activeAttempts,
    activeResults
  };
}
