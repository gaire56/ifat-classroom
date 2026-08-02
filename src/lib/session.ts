import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const teacherCookie = "ifat_teacher_session";
const groupCookie = "ifat_group_session";

type TeacherSession = { role: "teacher"; teacherId: string; email: string };
type GroupSession = { role: "group"; groupId: string; classId: string; loginId: string; authVersion: number };

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is missing.");
  return new TextEncoder().encode(value);
}

async function sign(payload: TeacherSession | GroupSession, hours: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${hours}h`)
    .sign(secret());
}

export async function setTeacherSession(payload: TeacherSession) {
  const store = await cookies();
  store.set(teacherCookie, await sign(payload, 12), {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 60 * 60 * 12
  });
}

export async function setGroupSession(payload: GroupSession) {
  const store = await cookies();
  store.set(groupCookie, await sign(payload, 24 * 7), {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7
  });
}

async function readCookie<T>(name: string): Promise<T | null> {
  const token = (await cookies()).get(name)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as T;
  } catch {
    return null;
  }
}

export async function requireTeacher(): Promise<TeacherSession> {
  const session = await readCookie<TeacherSession>(teacherCookie);
  if (!session || session.role !== "teacher") throw new Error("UNAUTHORIZED");
  return session;
}

export async function requireGroup(): Promise<GroupSession> {
  const session = await readCookie<GroupSession>(groupCookie);
  if (!session || session.role !== "group") throw new Error("UNAUTHORIZED");
  return session;
}

export async function clearTeacherSession() {
  (await cookies()).delete(teacherCookie);
}

export async function clearGroupSession() {
  (await cookies()).delete(groupCookie);
}
