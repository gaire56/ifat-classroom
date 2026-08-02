"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StudentLoginForm() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/student/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Login failed.");
    router.push("/student/scratch");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-semibold">Group ID
        <input value={loginId} onChange={e=>setLoginId(e.target.value)} autoCapitalize="characters"
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-lg font-bold tracking-wide" required />
      </label>
      <label className="block text-sm font-semibold">Password
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password"
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" required />
      </label>
      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-sky-600 px-4 py-3 font-black text-white disabled:opacity-50">
        {busy ? "Signing in…" : "Start activity"}
      </button>
    </form>
  );
}
