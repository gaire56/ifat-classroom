import ExcelJS from "exceljs";
import { requireTeacher } from "@/lib/session";
import { assertClassOwner, apiError } from "@/lib/authz";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildResults } from "@/lib/results";
import { decryptCredential } from "@/lib/credentials";
import { toCsv } from "@/lib/csv";

function filenameSafe(name: string) {
  return name.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "") || "ifat";
}

async function makeRows(classId: string, type: string) {
  const db = supabaseAdmin();
  const data = await buildResults(classId);
  const dayById = new Map<string, number>(data.days.map((d: any) => [d.id, Number(d.day_number)]));
  const qById = new Map<string, any>(data.questions.map((q: any) => [q.id, q]));

  if (type === "credentials") {
    const { data: groups, error } = await db.from("groups")
      .select("group_name,login_id,login_secret_enc,is_active").eq("class_id", classId).order("group_name");
    if (error) throw error;
    return (groups ?? []).map(g => ({
      Group: g.group_name,
      "Login ID": g.login_id,
      Password: g.login_secret_enc ? decryptCredential(g.login_secret_enc) : "",
      Active: g.is_active ? "Yes" : "No"
    }));
  }

  if (type === "current") {
    if (!data.activeQuestion) return [];
    return data.groups.map(g => {
      const ats = data.activeAttempts.filter(a => a.group_id === g.id);
      const res = data.activeResults.find(r => r.group_id === g.id);
      return {
        Group: g.group_name,
        "Scratched options": ats.map(a => a.selected_option).join(", "),
        Attempts: ats.length,
        Status: res?.completed ? "Correct" : ats.length ? "Still answering" : "Waiting",
        Points: res?.completed ? res.points : ""
      };
    });
  }

  if (type === "daily") {
    return data.groupRows.map(g => ({
      Group: g.group_name,
      "Day 1": g.dayTotals[1],
      "Day 2": g.dayTotals[2],
      "Day 3": g.dayTotals[3],
      "Day 4": g.dayTotals[4],
      "Day 5": g.dayTotals[5],
      "Final total": g.finalTotal
    }));
  }

  if (type === "ranking") {
    return data.ranking.map(g => ({
      Rank: g.rank,
      Group: g.group_name,
      "Day 1": g.dayTotals[1],
      "Day 2": g.dayTotals[2],
      "Day 3": g.dayTotals[3],
      "Day 4": g.dayTotals[4],
      "Day 5": g.dayTotals[5],
      "Final total": g.finalTotal
    }));
  }

  if (type === "attempts") {
    const groupName = new Map(data.groups.map(g => [g.id, g.group_name]));
    return data.attempts.map(a => {
      const q: any = qById.get(a.question_id)!;
      return {
        Group: groupName.get(a.group_id) ?? a.group_id,
        Day: dayById.get(q.class_day_id),
        Question: q.question_number,
        Option: a.selected_option,
        "Attempt number": a.attempt_number,
        Correct: a.is_correct ? "Yes" : "No",
        Points: a.points_awarded,
        Time: a.created_at
      };
    });
  }

  throw new Error("Unknown export type.");
}

export async function GET(request: Request) {
  try {
    const teacher = await requireTeacher();
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");
    const type = url.searchParams.get("type") ?? "ranking";
    const format = url.searchParams.get("format") ?? "csv";
    if (!classId) throw new Error("classId is required.");
    await assertClassOwner(classId, teacher.teacherId);

    const db = supabaseAdmin();
    const { data: classRow, error } = await db.from("classes").select("class_name").eq("id", classId).single();
    if (error) throw error;

    const rows = await makeRows(classId, type);
    const base = `${filenameSafe(classRow.class_name)}_${type}`;

    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("IF-AT Results");
      if (rows.length) {
        const headers = Object.keys(rows[0]);
        sheet.columns = headers.map(h => ({ header: h, key: h, width: Math.max(14, h.length + 2) }));
        rows.forEach(row => sheet.addRow(row));
        sheet.getRow(1).font = { bold: true };
        sheet.views = [{ state: "frozen", ySplit: 1 }];
      }
      const buffer = await workbook.xlsx.writeBuffer();
      return new Response(buffer as ArrayBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${base}.xlsx"`
        }
      });
    }

    return new Response(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.csv"`
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
