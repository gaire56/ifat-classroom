import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { setTeacherSession } from "@/lib/session";
import { apiError } from "@/lib/authz";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    // Client used only to verify the teacher's email/password.
    const authClient = supabaseAdmin();

    const { data, error } = await authClient.auth.signInWithPassword(body);

    if (error || !data.user) {
      return Response.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // IMPORTANT:
    // Use a fresh service-role client for the database lookup.
    // signInWithPassword changes the auth state of authClient.
    const adminDb = supabaseAdmin();

    const { data: teacher, error: teacherError } = await adminDb
      .from("teachers")
      .select("id,name,email")
      .eq("id", data.user.id)
      .maybeSingle();

    if (teacherError || !teacher) {
      console.error("Teacher lookup failed:", teacherError);

      return Response.json(
        { error: "Teacher account is not provisioned." },
        { status: 403 }
      );
    }

    await setTeacherSession({
      role: "teacher",
      teacherId: teacher.id,
      email: teacher.email
    });

    return Response.json({
      ok: true,
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email
      }
    });
  } catch (error) {
    return apiError(error);
  }
}