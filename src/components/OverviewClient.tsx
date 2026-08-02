"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RealtimeRefresh } from "./RealtimeRefresh";

export function OverviewClient({ classId, compact=false }: {classId:string; compact?:boolean}) {
  const [data,setData]=useState<any>(null);
  const load=useCallback(async()=>{
    const res=await fetch(`/api/teacher/overview?classId=${classId}`,{cache:"no-store"});
    if(res.ok)setData(await res.json());
  },[classId]);
  useEffect(()=>{void load();},[load]);
  if(!data)return <div className="rounded-2xl bg-white p-6">Loading dashboard…</div>;

  const cards=[
    ["Current day",data.currentDay?`Day ${data.currentDay}`:"—"],
    ["Active question",data.activeQuestion?`Q${data.activeQuestion}`:"None"],
    ["Student groups",data.groupCount],
    ["Answered",data.answeredCount],
    ["Still waiting",data.waitingCount],
    ["Current leader",data.leader?`${data.leader.groupName} · ${data.leader.score}`:"—"],
    ["Questions completed",data.completedQuestions]
  ];
  return <div className="space-y-5">
    <RealtimeRefresh classId={classId} onEvent={load}/>
    <div className={`grid gap-3 ${compact?"sm:grid-cols-3":"sm:grid-cols-2 lg:grid-cols-4"}`}>
      {cards.map(([label,value])=><div key={String(label)} className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</div>
        <div className="mt-2 text-2xl font-black">{String(value)}</div>
      </div>)}
    </div>
    {!compact&&<div className="flex flex-wrap gap-3">
      <Link href={`/teacher/class/${classId}/groups`} className="rounded-xl bg-sky-600 px-5 py-3 font-bold text-white">Manage groups</Link>
      <Link href={`/teacher/class/${classId}/questions`} className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white">Control questions</Link>
      <Link href={`/teacher/class/${classId}/results`} className="rounded-xl border bg-white px-5 py-3 font-bold">View live results</Link>
    </div>}
  </div>;
}
