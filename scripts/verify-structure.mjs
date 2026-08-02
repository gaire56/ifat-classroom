import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const required = [
  "src/app/teacher/login/page.tsx",
  "src/app/teacher/dashboard/page.tsx",
  "src/app/teacher/classes/page.tsx",
  "src/app/teacher/class/[classId]/page.tsx",
  "src/app/teacher/class/[classId]/groups/page.tsx",
  "src/app/teacher/class/[classId]/questions/page.tsx",
  "src/app/teacher/class/[classId]/results/page.tsx",
  "src/app/student/login/page.tsx",
  "src/app/student/scratch/page.tsx",
  "src/app/student/results/page.tsx",
  "supabase/migrations/001_init.sql",
  "scripts/seed.ts",
  ".env.example",
  "README.md"
];

const missing = required.filter(rel => !fs.existsSync(path.join(root, rel)));
if (missing.length) throw new Error(`Missing required files:\n${missing.join("\n")}`);

const sql = read("supabase/migrations/001_init.sql");
for (const needle of [
  "when 1 then 4",
  "when 2 then 3",
  "when 3 then 1",
  "else 0",
  "one_active_question_per_class",
  "unique(question_id, group_id, selected_option)",
  "unique(question_id, group_id, attempt_number)",
  "pg_advisory_xact_lock",
  "auth_version int not null default 1"
]) {
  if (!sql.includes(needle)) throw new Error(`Missing SQL integrity rule: ${needle}`);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const p = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(p) : [p];
  });
}
const studentFiles = walk(path.join(root, "src"))
  .filter(p => p.toLowerCase().includes("student") && /\.(ts|tsx)$/.test(p));
const studentText = studentFiles.map(p => fs.readFileSync(p, "utf8")).join("\n");
if (studentText.includes("correct_option")) {
  throw new Error("Security check failed: correct_option appears in student code.");
}

console.log("IF-AT structural/security checks: PASS");
