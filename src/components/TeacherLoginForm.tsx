"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TeacherLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/teacher/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Login failed.");
    router.push("/teacher/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-semibold">Email
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email"
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" required />
      </label>
      <label className="block text-sm font-semibold">Password
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="current-password"
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" required />
      </label>
      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-slate-950 px-4 py-3 font-bold text-white disabled:opacity-50">
        {busy ? "Signing in…" : "Teacher login"}
      </button>
    </form>
  );
}
