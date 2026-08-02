"use client";

import { useEffect, useState } from "react";
import { OverviewClient } from "./OverviewClient";
import Link from "next/link";

export function DashboardSelector(){
  const [classes,setClasses]=useState<any[]>([]);
  const [selected,setSelected]=useState("");
  useEffect(()=>{void (async()=>{
    const res=await fetch("/api/teacher/classes",{cache:"no-store"});
    if(!res.ok)return;
    const data=await res.json();
    setClasses(data.classes??[]);
    if(data.classes?.length)setSelected(data.classes[0].id);
  })()},[]);
  if(!classes.length)return <div className="rounded-3xl bg-white p-8 shadow-sm">
    <h2 className="text-xl font-black">No class yet</h2>
    <p className="mt-2 text-slate-500">Create a five-day class to begin.</p>
    <Link href="/teacher/classes" className="mt-5 inline-block rounded-xl bg-sky-600 px-5 py-3 font-bold text-white">Create class</Link>
  </div>;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-3xl font-black">Dashboard</h1><p className="text-slate-500">Live classroom overview</p></div>
      <select value={selected} onChange={e=>setSelected(e.target.value)} className="rounded-xl border bg-white px-4 py-3">
        {classes.map(c=><option key={c.id} value={c.id}>{c.class_name}</option>)}
      </select>
    </div>
    {selected&&<OverviewClient classId={selected}/>}
  </div>;
}
