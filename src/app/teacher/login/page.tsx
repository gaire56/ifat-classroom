import Link from "next/link";
import { TeacherLoginForm } from "@/components/TeacherLoginForm";

export default function TeacherLoginPage(){
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
      <Link href="/" className="text-sm font-bold text-sky-700">← Home</Link>
      <h1 className="mt-4 text-3xl font-black">Teacher login</h1>
      <p className="mt-2 mb-6 text-slate-500">Access classes, question controls, and live results.</p>
      <TeacherLoginForm/>
    </div>
  </main>;
}
