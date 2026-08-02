"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function ClassSettingsClient({ classId }: {classId:string}) {
  const router=useRouter();
  const [row,setRow]=useState<any>(null);
  const [message,setMessage]=useState("");
  useEffect(()=>{void (async()=>{
    const res=await fetch("/api/teacher/classes",{cache:"no-store"});
    const data=await res.json();
    setRow(data.classes?.find((c:any)=>c.id===classId)??null);
  })()},[classId]);

  async function patch(updates:any){
    setMessage("");
    const res=await fetch("/api/teacher/classes",{method:"PATCH",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({classId,...updates})});
    const data=await res.json();
    if(!res.ok)return setMessage(data.error);
    setRow(data.class); setMessage("Saved.");
  }

  async function renameClass(){
    if(!row)return;
    const name=prompt("Class name",row.class_name);
    if(!name||name===row.class_name)return;
    await patch({className:name});
  }

  async function deleteClass(){
    if(!row)return;
    if(!confirm(`Delete "${row.class_name}" and all groups, questions, attempts, and results? This cannot be undone.`))return;
    const res=await fetch("/api/teacher/classes",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({classId})});
    const data=await res.json();
    if(!res.ok)return setMessage(data.error??"Could not delete class.");
    router.push("/teacher/classes");
    router.refresh();
  }

  if(!row)return null;
  return <div className="rounded-2xl bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h2 className="text-xl font-black">{row.class_name}</h2><p className="text-sm text-slate-500">{row.start_date} → {row.end_date}</p>
        <div className="mt-2 flex gap-2"><button onClick={()=>void renameClass()} className="rounded-lg border px-3 py-1.5 text-xs font-bold">Rename</button>
        <button onClick={()=>void deleteClass()} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700">Delete class</button></div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={row.show_student_results} onChange={e=>void patch({showStudentResults:e.target.checked})}/>
          Show final score/rank to students
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">Current day
          <select value={row.current_day ?? 1} onChange={e=>void patch({currentDay:Number(e.target.value)})} className="rounded-xl border px-3 py-2">
            {[1,2,3,4,5].map(n=><option key={n} value={n}>Day {n}</option>)}
          </select>
        </label>
        <select value={row.status} onChange={e=>void patch({status:e.target.value})} className="rounded-xl border px-3 py-2">
          <option value="draft">Draft</option><option value="active">Active</option><option value="completed">Completed</option>
        </select>
      </div>
    </div>
    {message&&<p className="mt-3 text-sm text-slate-500">{message}</p>}
  </div>;
}
