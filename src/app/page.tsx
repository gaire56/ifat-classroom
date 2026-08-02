import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 px-6 py-16 text-white">
      <div className="mx-auto flex min-h-[75vh] max-w-5xl flex-col justify-center">
        <div className="mb-10 max-w-2xl">
          <div className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm">
            Immediate Feedback Assessment Technique
          </div>
          <h1 className="text-5xl font-black tracking-tight sm:text-6xl">IF-AT Classroom</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            A five-day, real-time scratch-card activity with protected teacher controls,
            server-side scoring, and live group rankings.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Link href="/teacher/login" className="rounded-3xl bg-white p-8 text-slate-900 shadow-2xl transition hover:-translate-y-1">
            <div className="text-sm font-bold uppercase tracking-widest text-sky-700">Teacher</div>
            <h2 className="mt-2 text-2xl font-bold">Open teacher dashboard</h2>
            <p className="mt-3 text-slate-600">Create classes, manage groups, activate questions, and watch scores live.</p>
          </Link>

          <Link href="/student/login" className="rounded-3xl border border-white/20 bg-white/10 p-8 backdrop-blur transition hover:-translate-y-1 hover:bg-white/15">
            <div className="text-sm font-bold uppercase tracking-widest text-sky-300">Student Group</div>
            <h2 className="mt-2 text-2xl font-bold">Open scratch card</h2>
            <p className="mt-3 text-slate-300">Log in with your group ID and password, then scratch the active question.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
