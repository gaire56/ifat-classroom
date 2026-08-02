import Link from "next/link";
import { StudentLoginForm } from "@/components/StudentLoginForm";

export default function StudentLoginPage(){
  return <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-700 to-slate-950 p-6">
    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
      <Link href="/" className="text-sm font-bold text-sky-700">← Home</Link>
      <div className="mt-4 text-sm font-bold uppercase tracking-widest text-sky-600">Student group</div>
      <h1 className="mt-1 text-3xl font-black">Join your class</h1>
      <p className="mt-2 mb-6 text-slate-500">Use the group ID and password given by your teacher.</p>
      <StudentLoginForm/>
    </div>
  </main>;
}
