import { z } from "zod";
import { requireGroup } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { apiError } from "@/lib/authz";

const schema = z.object({
  questionId: z.string().uuid(),
  option: z.enum(["A","B","C","D"])
});

export async function POST(request: Request) {
  try {
    const session = await requireGroup();
    const input = schema.parse(await request.json());
    const db = supabaseAdmin();

    const { data: group, error: groupError } = await db.from("groups")
      .select("id,class_id,is_active,auth_version")
      .eq("id", session.groupId).single();
    if (groupError) throw groupError;
    if (!group.is_active || group.class_id !== session.classId || group.auth_version !== session.authVersion) {
      return Response.json({ error: "Group session is no longer valid. Please log in again." }, { status: 401 });
    }

    const { data, error } = await db.rpc("submit_group_attempt", {
      p_question_id: input.questionId,
      p_group_id: session.groupId,
      p_option: input.option
    });
    if (error) {
      const msg = error.message ?? "";
      if (msg.includes("OPTION_ALREADY_ATTEMPTED")) {
        return Response.json({ error: "That option was already scratched." }, { status: 409 });
      }
      if (msg.includes("QUESTION_ALREADY_COMPLETED")) {
        return Response.json({ error: "This question is already completed." }, { status: 409 });
      }
      if (msg.includes("QUESTION_NOT_ACTIVE")) {
        return Response.json({ error: "The question is no longer active." }, { status: 409 });
      }
      throw error;
    }

    const row = data?.[0];
    return Response.json({
      correct: !!row?.correct,
      attemptNumber: row?.attempt_number,
      pointsEarned: row?.correct ? row?.points_earned : undefined
    });
  } catch (error) {
    return apiError(error);
  }
}
