import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { encryptCredential } from "../src/lib/credentials";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.");

const db = createClient(url, key, { auth: { persistSession: false } });

const DEMO_TEACHER = {
  email: "teacher@ifat.local",
  password: "DemoTeacher!2026",
  name: "Demo Teacher"
};

const DEMO_GROUPS = [
  { group_name: "Group 1", login_id: "DEMO-G1", password: "Group1!Demo" },
  { group_name: "Group 2", login_id: "DEMO-G2", password: "Group2!Demo" },
  { group_name: "Group 3", login_id: "DEMO-G3", password: "Group3!Demo" },
  { group_name: "Group 4", login_id: "DEMO-G4", password: "Group4!Demo" },
  { group_name: "Group 5", login_id: "DEMO-G5", password: "Group5!Demo" }
];

const CORRECT = ["A","B","C","D","A"] as const;

async function getOrCreateTeacher() {
  const { data: users, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  let user = users.users.find(u => u.email === DEMO_TEACHER.email);

  if (!user) {
    const { data, error } = await db.auth.admin.createUser({
      email: DEMO_TEACHER.email,
      password: DEMO_TEACHER.password,
      email_confirm: true
    });
    if (error) throw error;
    user = data.user;
  }

  const { error } = await db.from("teachers").upsert({
    id: user.id, name: DEMO_TEACHER.name, email: DEMO_TEACHER.email
  });
  if (error) throw error;
  return user.id;
}

function attemptsFor(correct: "A"|"B"|"C"|"D", attemptCount: number) {
  const wrong = (["A","B","C","D"] as const).filter(o => o !== correct);
  return [...wrong.slice(0, attemptCount - 1), correct];
}

function scoreForAttempt(attempt: number) {
  return attempt === 1 ? 4 : attempt === 2 ? 3 : attempt === 3 ? 1 : 0;
}

async function main() {
  const teacherId = await getOrCreateTeacher();

  const { data: oldClasses } = await db.from("classes").select("id")
    .eq("teacher_id", teacherId).eq("class_name", "Demo IF-AT Five-Day Class");
  if (oldClasses?.length) {
    const { error } = await db.from("classes").delete().in("id", oldClasses.map(c => c.id));
    if (error) throw error;
  }

  const start = new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + 4);
  const iso = (d: Date) => d.toISOString().slice(0,10);

  const { data: classRow, error: classError } = await db.from("classes").insert({
    teacher_id: teacherId,
    class_name: "Demo IF-AT Five-Day Class",
    start_date: iso(start),
    end_date: iso(end),
    status: "active",
    show_student_results: false
  }).select().single();
  if (classError) throw classError;

  const { data: days, error: dayError } = await db.from("class_days")
    .select("id,day_number").eq("class_id", classRow.id).order("day_number");
  if (dayError) throw dayError;
  const day1 = days!.find(d => d.day_number === 1)!;

  const { data: questionsRaw, error: qError } = await db.from("questions").insert(
    CORRECT.map((correct_option, i) => ({
      class_id: classRow.id,
      class_day_id: day1.id,
      question_number: i + 1,
      correct_option,
      status: i === 4 ? "active" : "closed",
      activated_at: i === 4 ? new Date().toISOString() : null,
      closed_at: i < 4 ? new Date().toISOString() : null
    }))
  ).select();
  if (qError) throw qError;
  const questions: any[] = questionsRaw ?? [];

  const groupRows: any[] = [];
  for (const g of DEMO_GROUPS) {
    const { data, error } = await db.from("groups").insert({
      class_id: classRow.id,
      group_name: g.group_name,
      login_id: g.login_id,
      password_hash: await bcrypt.hash(g.password, 12),
      login_secret_enc: encryptCredential(g.password),
      is_active: true
    }).select().single();
    if (error) throw error;
    groupRows.push(data);
  }

  // Seed three completed questions with varied scores.
  const scoreAttempts = [
    [1,2,3,4,1],
    [2,1,3,2,4],
    [1,3,2,1,2]
  ];

  for (let qi = 0; qi < 3; qi++) {
    const q = questions.find(q => q.question_number === qi + 1)!;
    const correct = CORRECT[qi];

    for (let gi = 0; gi < groupRows.length; gi++) {
      const group = groupRows[gi];
      const attemptCount = scoreAttempts[qi][gi];
      const options = attemptsFor(correct, attemptCount);
      for (let ai = 0; ai < options.length; ai++) {
        const isCorrect = ai === options.length - 1;
        const { error } = await db.from("attempts").insert({
          question_id: q.id,
          group_id: group.id,
          selected_option: options[ai],
          attempt_number: ai + 1,
          is_correct: isCorrect,
          points_awarded: isCorrect ? scoreForAttempt(ai + 1) : 0
        });
        if (error) throw error;
      }
      const { error } = await db.from("question_results").insert({
        question_id: q.id,
        group_id: group.id,
        attempt_count: attemptCount,
        completed: true,
        points: scoreForAttempt(attemptCount),
        completed_at: new Date().toISOString()
      });
      if (error) throw error;
    }
  }

  console.log("\nDemo seed complete.\n");
  console.log("Teacher:");
  console.log(`  ${DEMO_TEACHER.email} / ${DEMO_TEACHER.password}`);
  console.log("\nGroups:");
  for (const g of DEMO_GROUPS) console.log(`  ${g.group_name}: ${g.login_id} / ${g.password}`);
  console.log("\nThese credentials are development seed data only.");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
