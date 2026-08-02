"use client";

import { useEffect, useRef, useState } from "react";

type Option = "A"|"B"|"C"|"D";
type Feedback = "correct"|"wrong"|null;

export function ScratchCard({
  option, disabled, feedback, busy, onStart, onThreshold
}: {
  option: Option;
  disabled: boolean;
  feedback: Feedback;
  busy: boolean;
  onStart: () => boolean;
  onThreshold: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement|null>(null);
  const drawing = useRef(false);
  const submitted = useRef(false);
  const [percent,setPercent]=useState(0);

  useEffect(()=>{
    submitted.current = !!feedback;
    setPercent(feedback ? 100 : 0);
    const canvas=canvasRef.current;
    if(!canvas || feedback) return;
    const ctx=canvas.getContext("2d",{willReadFrequently:true});
    if(!ctx)return;

    ctx.globalCompositeOperation="source-over";
    const gradient=ctx.createLinearGradient(0,0,canvas.width,canvas.height);
    gradient.addColorStop(0,"#cbd5e1");
    gradient.addColorStop(.45,"#f8fafc");
    gradient.addColorStop(.6,"#94a3b8");
    gradient.addColorStop(1,"#e2e8f0");
    ctx.fillStyle=gradient;
    ctx.fillRect(0,0,canvas.width,canvas.height);

    for(let i=0;i<1200;i++){
      const v=130+Math.floor(Math.random()*90);
      ctx.fillStyle=`rgba(${v},${v},${v},0.18)`;
      ctx.fillRect(Math.random()*canvas.width,Math.random()*canvas.height,Math.random()*3+1,Math.random()*2+1);
    }

    ctx.fillStyle="rgba(30,41,59,.72)";
    ctx.font="800 28px system-ui";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillText(`${option}  •  SCRATCH HERE`,canvas.width/2,canvas.height/2);
  },[option,feedback]);

  function coords(e:React.PointerEvent<HTMLCanvasElement>){
    const canvas=canvasRef.current!;
    const r=canvas.getBoundingClientRect();
    return {x:(e.clientX-r.left)*(canvas.width/r.width),y:(e.clientY-r.top)*(canvas.height/r.height)};
  }

  function scratchAt(x:number,y:number){
    const canvas=canvasRef.current;
    const ctx=canvas?.getContext("2d",{willReadFrequently:true});
    if(!canvas||!ctx)return;
    ctx.globalCompositeOperation="destination-out";
    ctx.beginPath();
    ctx.arc(x,y,34,0,Math.PI*2);
    ctx.fill();
  }

  function measure(){
    const canvas=canvasRef.current;
    const ctx=canvas?.getContext("2d",{willReadFrequently:true});
    if(!canvas||!ctx)return;
    const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let transparent=0,total=0;
    const pixelStride=12;
    for(let p=0;p<canvas.width*canvas.height;p+=pixelStride){
      total++;
      if(data[p*4+3]<60)transparent++;
    }
    const removed=transparent/total;
    setPercent(Math.round(removed*100));
    if(removed>=0.55 && !submitted.current){
      submitted.current=true;
      drawing.current=false;
      onThreshold();
    }
  }

  function down(e:React.PointerEvent<HTMLCanvasElement>){
    if(disabled||busy||feedback||submitted.current)return;
    if(!onStart())return;
    drawing.current=true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p=coords(e);scratchAt(p.x,p.y);
  }
  function move(e:React.PointerEvent<HTMLCanvasElement>){
    if(!drawing.current||disabled||busy)return;
    const p=coords(e);scratchAt(p.x,p.y);
    if(Math.random()<0.2)measure();
  }
  function up(){
    if(!drawing.current)return;
    drawing.current=false;measure();
  }

  const tone=feedback==="correct"?"border-emerald-300 bg-emerald-50":feedback==="wrong"?"border-rose-300 bg-rose-50":"border-slate-200 bg-white";

  return (
    <div className={`relative min-h-44 overflow-hidden rounded-3xl border-2 ${tone} shadow-sm`}>
      <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center">
        <div className="text-6xl font-black">{option}</div>
        {feedback==="correct"&&<div className="mt-2 text-xl font-black text-emerald-700">Correct</div>}
        {feedback==="wrong"&&<div className="mt-2 text-lg font-black text-rose-700">Wrong — Try Again</div>}
        {!feedback&&busy&&<div className="mt-2 font-bold text-slate-500">Checking…</div>}
      </div>
      {!feedback&&(
        <canvas
          ref={canvasRef} width={600} height={220}
          aria-label={`${option} scratch area`}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          className={`relative z-10 h-44 w-full touch-none select-none ${disabled?"cursor-not-allowed opacity-70":"cursor-crosshair"}`}
        />
      )}
      {!feedback&&percent>0&&<div className="absolute bottom-2 right-3 z-20 rounded-full bg-black/60 px-2 py-1 text-xs font-bold text-white">{percent}%</div>}
      {disabled&&!feedback&&<div className="absolute inset-0 z-30 bg-white/20" aria-hidden="true"/>}
    </div>
  );
}
