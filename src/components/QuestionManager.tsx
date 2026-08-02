"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RealtimeRefresh } from "./RealtimeRefresh";

type Day = { id:string; day_number:number; date:string|null; status:string };
type Question = {
  id:string; class_id:string; class_day_id:string; question_number:number;
  correct_option:"A"|"B"|"C"|"D"; status:"draft"|"active"|"closed";
};

export function QuestionManager({ classId }: { classId: string }) {
  const [days,setDays]=useState<Day[]>([]);
  const [questions,setQuestions]=useState<Question[]>([]);
  const [dayNumber,setDayNumber]=useState(1);
  const [questionNumber,setQuestionNumber]=useState(1);
  const [correctOption,setCorrectOption]=useState<"A"|"B"|"C"|"D">("A");
  const [error,setError]=useState("");

  const load=useCallback(async()=>{
    const res=await fetch(`/api/teacher/questions?classId=${classId}`,{cache:"no-store"});
    const data=await res.json();
    if(res.ok){setDays(data.days??[]);setQuestions(data.questions??[]);} else setError(data.error);
  },[classId]);

  useEffect(()=>{void load();},[load]);

  const dayIdToNumber=useMemo(()=>new Map(days.map(d=>[d.id,d.day_number])),[days]);
  const ordered=[...questions].sort((a,b)=>
    (dayIdToNumber.get(a.class_day_id)!-dayIdToNumber.get(b.class_day_id)!) ||
    a.question_number-b.question_number
  );

  async function create(e:React.FormEvent){
    e.preventDefault();setError("");
    const res=await fetch("/api/teacher/questions",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({classId,dayNumber,questionNumber,correctOption})});
    const data=await res.json();
    if(!res.ok)return setError(data.error);
    setQuestionNumber(n=>n+1); await load();
  }


  async function editQuestion(q:Question){
    if(q.status==="active"){setError("Close the question before editing its answer.");return;}
    const numberRaw=prompt("Question number",String(q.question_number));
    if(numberRaw===null)return;
    const optionRaw=prompt("Correct option (A, B, C, or D)",q.correct_option)?.toUpperCase();
    if(!optionRaw||!["A","B","C","D"].includes(optionRaw)){setError("Correct option must be A, B, C, or D.");return;}
    const res=await fetch("/api/teacher/questions",{method:"PATCH",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({classId,questionId:q.id,questionNumber:Number(numberRaw),correctOption:optionRaw})});
    const data=await res.json();
    if(!res.ok)return setError(data.error);
    await load();
  }

  async function control(action:string,q:Question){
    if((action==="resetAll") && !confirm("Reset ALL recorded attempts for this question? This cannot be undone.")) return;
    const res=await fetch("/api/teacher/question-control",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({action,classId,questionId:q.id})});
    const data=await res.json();
    if(!res.ok)return setError(data.error);
    await load();
  }

  return (
    <div className="space-y-6">
      <RealtimeRefresh classId={classId} onEvent={load}/>
      <form onSubmit={create} className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-4">
        <label className="text-sm font-semibold">Day
          <select value={dayNumber} onChange={e=>setDayNumber(Number(e.target.value))} className="mt-1 w-full rounded-xl border px-3 py-3">
            {[1,2,3,4,5].map(n=><option key={n} value={n}>Day {n}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Question
          <input type="number" min={1} value={questionNumber} onChange={e=>setQuestionNumber(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border px-3 py-3" />
        </label>
        <label className="text-sm font-semibold">Correct option
          <select value={correctOption} onChange={e=>setCorrectOption(e.target.value as any)} className="mt-1 w-full rounded-xl border px-3 py-3">
            {["A","B","C","D"].map(o=><option key={o}>{o}</option>)}
          </select>
        </label>
        <button className="mt-auto rounded-xl bg-sky-600 px-4 py-3 font-bold text-white">Create question</button>
      </form>

      {error&&<p className="rounded-xl bg-rose-50 p-3 text-rose-700">{error}</p>}

      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Day</th><th>Question</th><th>Correct</th><th>Status</th><th>Controls</th></tr></thead>
          <tbody>
            {ordered.map(q=>(
              <tr key={q.id}>
                <td>Day {dayIdToNumber.get(q.class_day_id)}</td>
                <td className="font-bold">Q{q.question_number}</td>
                <td><span className="rounded-lg bg-slate-100 px-3 py-1 font-black">{q.correct_option}</span></td>
                <td><span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                  q.status==="active"?"bg-emerald-100 text-emerald-800":q.status==="closed"?"bg-slate-200":"bg-amber-100 text-amber-800"
                }`}>{q.status}</span></td>
                <td className="flex flex-wrap gap-2">
                  {q.status!=="active" && <>
                    <button onClick={()=>void editQuestion(q)} className="rounded-lg border px-3 py-2 text-xs font-bold">Edit</button>
                    <button onClick={()=>void control(q.status==="closed"?"reopen":"activate",q)} className="rounded-lg border px-3 py-2 text-xs font-bold">{q.status==="closed"?"Reopen":"Activate"}</button>
                  </>}
                  {q.status==="active" && <>
                    <button onClick={()=>void control("close",q)} className="rounded-lg border px-3 py-2 text-xs font-bold">Close</button>
                    <button onClick={()=>void control("next",q)} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white">Next question</button>
                  </>}
                  <button onClick={()=>void control("resetAll",q)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700">Reset all attempts</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
