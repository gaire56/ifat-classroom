"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function TeacherShell({ children, classId }: { children: React.ReactNode; classId?: string }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/teacher/logout", { method: "POST" });
    router.push("/teacher/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/teacher/dashboard" className="font-black tracking-tight text-slate-950">IF-AT Teacher</Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/teacher/dashboard" className="rounded-lg px-3 py-2 hover:bg-slate-100">Dashboard</Link>
            <Link href="/teacher/classes" className="rounded-lg px-3 py-2 hover:bg-slate-100">Classes</Link>
            {classId && <Link href={`/teacher/class/${classId}`} className="rounded-lg px-3 py-2 hover:bg-slate-100">Class</Link>}
            <button onClick={logout} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100">
              <LogOut size={16}/> Log out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </div>
  );
}
