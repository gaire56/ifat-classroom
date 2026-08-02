"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RealtimeRefresh } from "./RealtimeRefresh";

type Payload = any;

export function ResultsClient({ classId }: { classId:string }) {
  const [data,setData]=useState<Payload|null>(null);
  const [day,setDay]=useState(1);
  const [error,setError]=useState("");

  const load=useCallback(async()=>{
    const res=await fetch(`/api/teacher/results?classId=${classId}`,{cache:"no-store"});
    const json=await res.json();
    if(res.ok)setData(json); else setError(json.error);
  },[classId]);

  useEffect(()=>{void load();},[load]);

  const dayQuestions=useMemo(()=>data?.questions?.filter((q:any)=>q.dayNumber===day).sort((a:any,b:any)=>a.questionNumber-b.questionNumber)??[],[data,day]);

  async function resetGroup(groupId:string){
    if(!data?.currentQuestion) return;
    if(!confirm("Reset this group's recorded attempts for the active question?")) return;
    const res=await fetch("/api/teacher/question-control",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({action:"resetGroup",classId,questionId:data.currentQuestion.id,groupId})});
    const json=await res.json(); if(!res.ok)return setError(json.error); await load();
  }

  if(!data) return <div className="rounded-2xl bg-white p-8">Loading live results… {error}</div>;

  return (
    <div className="space-y-8">
      <RealtimeRefresh classId={classId} onEvent={load}/>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">Live question results</h2>
            <p className="text-slate-500">{data.currentQuestion ? `Day ${data.currentQuestion.dayNumber} · Question ${data.currentQuestion.questionNumber}` : "No active question"}</p>
          </div>
          <button onClick={()=>void load()} className="rounded-xl border bg-white px-4 py-2 text-sm font-bold">Refresh</button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Group</th><th>Scratched options</th><th>Attempts</th><th>Status</th><th>Points</th><th></th></tr></thead>
            <tbody>
              {data.currentQuestionRows.map((r:any)=>(
                <tr key={r.groupId}>
                  <td className="font-semibold">{r.groupName}</td>
                  <td>{r.scratchedOptions.join(", ")||"—"}</td>
                  <td>{r.attempts}</td>
                  <td>{r.status}</td>
                  <td>{r.points??"—"}</td>
                  <td><button onClick={()=>void resetGroup(r.groupId)} className="rounded-lg border px-3 py-2 text-xs font-bold">Reset group</button></td>
                </tr>
              ))}
              {!data.currentQuestionRows.length&&<tr><td colSpan={6} className="text-slate-500">Activate a question to see live results.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">Daily results</h2>
            <p className="text-slate-500">Scores update whenever a group completes a question.</p>
          </div>
          <select value={day} onChange={e=>setDay(Number(e.target.value))} className="rounded-xl border bg-white px-4 py-2">
            {[1,2,3,4,5].map(n=><option key={n} value={n}>Day {n}</option>)}
          </select>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Group</th>{dayQuestions.map((q:any)=><th key={q.id}>Q{q.questionNumber}</th>)}<th>Daily total</th></tr></thead>
            <tbody>
              {data.groupRows.map((g:any)=>(
                <tr key={g.id}><td className="font-semibold">{g.group_name}</td>
                  {dayQuestions.map((q:any)=><td key={q.id}>{g.questionScores[`${day}-${q.questionNumber}`]??"—"}</td>)}
                  <td className="font-black">{g.dayTotals[day]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-black">Final five-day ranking</h2>
        <p className="mb-3 text-slate-500">Ties use standard competition ranking: 1, 2, 2, 4.</p>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Rank</th><th>Group</th>{[1,2,3,4,5].map(n=><th key={n}>Day {n}</th>)}<th>Final total</th></tr></thead>
            <tbody>
              {data.ranking.map((g:any)=>(
                <tr key={g.id}><td className="text-xl font-black">{g.rank}</td><td className="font-semibold">{g.group_name}</td>
                  {[1,2,3,4,5].map(n=><td key={n}>{g.dayTotals[n]}</td>)}<td className="font-black">{g.finalTotal}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        {["current","daily","ranking","attempts"].map(type=>(
          <div key={type} className="flex gap-1">
            <a href={`/api/teacher/export?classId=${classId}&type=${type}&format=csv`} className="rounded-lg border bg-white px-3 py-2 text-xs font-bold">{type} CSV</a>
            <a href={`/api/teacher/export?classId=${classId}&type=${type}&format=xlsx`} className="rounded-lg border bg-white px-3 py-2 text-xs font-bold">{type} Excel</a>
          </div>
        ))}
      </section>
    </div>
  );
}
