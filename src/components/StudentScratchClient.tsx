"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ScratchCard } from "./ScratchCard";
import { RealtimeRefresh } from "./RealtimeRefresh";

type Option="A"|"B"|"C"|"D";

type State = {
  classId:string;
  className:string;
  classStatus:"draft"|"active"|"completed";
  showStudentResults:boolean;
  groupName:string;
  activeQuestion:null|{id:string;dayNumber:number;questionNumber:number;status:string};
  attempts:{selected_option:Option;attempt_number:number;is_correct:boolean;points_awarded:number}[];
  result:null|{attempt_count:number;completed:boolean;points:number;completed_at:string|null};
  final:null|{score:number;rank:number};
};

export function StudentScratchClient(){
  const router=useRouter();
  const [state,setState]=useState<State|null>(null);
  const [error,setError]=useState("");
  const [activeScratch,setActiveScratch]=useState<Option|null>(null);
  const [submitting,setSubmitting]=useState<Option|null>(null);
  const [questionKey,setQuestionKey]=useState("");

  const load=useCallback(async()=>{
    const res=await fetch("/api/student/state",{cache:"no-store"});
    if(res.status===401){router.push("/student/login");return;}
    const data=await res.json();
    if(!res.ok){setError(data.error??"Could not load activity.");return;}
    setState(data);setError("");
    const key=data.activeQuestion?.id??"none";
    if(key!==questionKey){setQuestionKey(key);setActiveScratch(null);setSubmitting(null);}
  },[router,questionKey]);

  useEffect(()=>{
    void load();
    const timer=setInterval(()=>void load(),10000);
    return()=>clearInterval(timer);
  },[load]);

  const feedback=useMemo(()=>{
    const map=new Map<Option,"correct"|"wrong">();
    for(const a of state?.attempts??[])map.set(a.selected_option,a.is_correct?"correct":"wrong");
    return map;
  },[state?.attempts]);

  async function submit(option:Option){
    if(!state?.activeQuestion||submitting)return;
    setSubmitting(option);
    const res=await fetch("/api/student/attempt",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({questionId:state.activeQuestion.id,option})});
    const data=await res.json();
    if(!res.ok)setError(data.error??"Could not submit the scratch.");
    await load();
    setSubmitting(null);
    if(!data.correct)setActiveScratch(null);
  }

  async function logout(){
    await fetch("/api/student/logout",{method:"POST"});
    router.push("/student/login");router.refresh();
  }

  if(!state)return <main className="min-h-screen p-6"><div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-card">Loading activity… {error}</div></main>;

  if(state.classStatus==="completed"){
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <RealtimeRefresh classId={state.classId} onEvent={load}/>
      <div className="w-full max-w-xl rounded-3xl bg-white p-8 text-center text-slate-900 shadow-2xl">
        <div className="text-sm font-bold uppercase tracking-widest text-sky-600">{state.className}</div>
        <h1 className="mt-3 text-3xl font-black">The class activity is complete.</h1>
        {state.showStudentResults&&state.final
          ? <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-100 p-5"><div className="text-sm text-slate-500">Final score</div><div className="text-4xl font-black">{state.final.score}</div></div><div className="rounded-2xl bg-slate-100 p-5"><div className="text-sm text-slate-500">Final rank</div><div className="text-4xl font-black">#{state.final.rank}</div></div></div>
          : <p className="mt-5 text-slate-600">Final scores are hidden by your teacher.</p>}
        <button onClick={logout} className="mt-6 rounded-xl border px-4 py-2 font-bold">Log out</button>
      </div>
    </main>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-slate-100 px-4 py-6 sm:px-6">
      <RealtimeRefresh classId={state.classId} onEvent={load}/>
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-bold uppercase tracking-widest text-sky-700">{state.groupName}</div>
            <h1 className="mt-1 text-3xl font-black">{state.className}</h1>
          </div>
          <button onClick={logout} className="rounded-xl border bg-white px-4 py-2 text-sm font-bold">Log out</button>
        </header>

        {error&&<div className="mb-5 rounded-2xl bg-rose-50 p-4 font-semibold text-rose-700">{error}</div>}

        {!state.activeQuestion ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-card">
            <div className="text-5xl">⏳</div>
            <h2 className="mt-4 text-2xl font-black">No question is active.</h2>
            <p className="mt-2 text-slate-600">Please wait for your teacher.</p>
          </div>
        ) : state.result?.completed ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-10 text-center shadow-card">
            <div className="text-5xl">✓</div>
            <h2 className="mt-4 text-3xl font-black text-emerald-900">Correct!</h2>
            <p className="mt-3 text-xl font-bold">You earned {state.result.points} points.</p>
            <p className="mt-2 text-slate-600">You have completed this question. Please wait for the next question.</p>
          </div>
        ) : (
          <>
            <div className="mb-5 rounded-2xl bg-white p-5 text-center shadow-sm">
              <div className="text-lg font-bold text-slate-500">Day {state.activeQuestion.dayNumber}</div>
              <div className="text-3xl font-black">Question {state.activeQuestion.questionNumber}</div>
              <p className="mt-2 text-sm text-slate-500">Scratch one option until at least 55% is removed.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {(["A","B","C","D"] as Option[]).map(option=>(
                <ScratchCard key={`${state.activeQuestion!.id}-${option}`}
                  option={option}
                  feedback={feedback.get(option)??null}
                  busy={submitting===option}
                  disabled={!!submitting || (!!activeScratch&&activeScratch!==option) || feedback.has(option)}
                  onStart={()=>{
                    if(activeScratch&&activeScratch!==option)return false;
                    setActiveScratch(option);return true;
                  }}
                  onThreshold={()=>void submit(option)}
                />
              ))}
            </div>
            <div className="mt-5 rounded-2xl bg-white p-4 text-center text-sm text-slate-600 shadow-sm">
              Attempts used: <strong>{state.attempts.length}</strong> / 4
            </div>
          </>
        )}
      </div>
    </main>
  );
}
