"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function StudentResultsClient(){
  const [state,setState]=useState<any>(null);
  useEffect(()=>{void (async()=>{const r=await fetch("/api/student/state",{cache:"no-store"});if(r.ok)setState(await r.json())})()},[]);
  return <main className="min-h-screen p-6"><div className="mx-auto max-w-xl rounded-3xl bg-white p-8 shadow-card">
    <h1 className="text-2xl font-black">Your group results</h1>
    {!state&&<p className="mt-4">Loading…</p>}
    {state&&state.classStatus!=="completed"&&<p className="mt-4 text-slate-600">Final results are available after the teacher completes the class.</p>}
    {state?.classStatus==="completed"&&!state.showStudentResults&&<p className="mt-4 text-slate-600">Your teacher has hidden final results.</p>}
    {state?.final&&<div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-100 p-5"><div>Score</div><div className="text-4xl font-black">{state.final.score}</div></div><div className="rounded-2xl bg-slate-100 p-5"><div>Rank</div><div className="text-4xl font-black">#{state.final.rank}</div></div></div>}
    <Link href="/student/scratch" className="mt-6 inline-block rounded-xl bg-slate-950 px-4 py-3 font-bold text-white">Back to activity</Link>
  </div></main>;
}
