"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ClassRow = {
  id: string; class_name: string; start_date: string; end_date: string;
  status: "draft"|"active"|"completed"; show_student_results: boolean;
};

export function ClassesManager() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [className, setClassName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/teacher/classes", { cache: "no-store" });
    const data = await res.json();
    if (res.ok) setClasses(data.classes ?? []);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setMessage("");
    const res = await fetch("/api/teacher/classes", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ className, startDate, endDate })
    });
    const data = await res.json();
    if (!res.ok) return setMessage(data.error ?? "Could not create class.");
    setClassName(""); setStartDate(""); setEndDate(""); setMessage("Class created with five class days.");
    await load();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      <form onSubmit={create} className="h-fit rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-black">Create a class</h2>
        <div className="mt-5 space-y-4">
          <input value={className} onChange={e=>setClassName(e.target.value)} placeholder="Class name"
            className="w-full rounded-xl border border-slate-300 px-4 py-3" required />
          <label className="block text-sm font-semibold">Start date
            <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" required />
          </label>
          <label className="block text-sm font-semibold">End date
            <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" required />
          </label>
          <button className="w-full rounded-xl bg-sky-600 px-4 py-3 font-bold text-white">Create class</button>
          {message && <p className="text-sm text-slate-600">{message}</p>}
        </div>
      </form>

      <div>
        <h2 className="mb-4 text-xl font-black">Your classes</h2>
        <div className="grid gap-4">
          {classes.map(c => (
            <Link key={c.id} href={`/teacher/class/${c.id}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">{c.class_name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{c.start_date} → {c.end_date}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase">{c.status}</span>
              </div>
            </Link>
          ))}
          {!classes.length && <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No classes yet.</p>}
        </div>
      </div>
    </div>
  );
}
