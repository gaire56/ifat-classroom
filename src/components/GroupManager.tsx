"use client";

import { useCallback, useEffect, useState } from "react";

type Group = { id:string; group_name:string; login_id:string; is_active:boolean; last_login_at:string|null; total_score:number };

export function GroupManager({ classId }: { classId: string }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupName, setGroupName] = useState("");
  const [credential, setCredential] = useState<{loginId:string;password:string}|null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/teacher/groups?classId=${classId}`, { cache: "no-store" });
    const data = await res.json();
    if (res.ok) setGroups(data.groups ?? []); else setError(data.error);
  }, [classId]);

  useEffect(()=>{ void load(); },[load]);

  async function create(e:React.FormEvent) {
    e.preventDefault(); setError("");
    const res = await fetch("/api/teacher/groups", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({classId,groupName})
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setCredential({loginId:data.group.login_id,password:data.password});
    setGroupName(""); await load();
  }


  async function edit(group:Group) {
    const next=prompt("Group name",group.group_name);
    if(!next||next===group.group_name)return;
    const res=await fetch("/api/teacher/groups",{
      method:"PATCH",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({classId,groupId:group.id,groupName:next})
    });
    const data=await res.json();
    if(!res.ok)return setError(data.error);
    await load();
  }

  async function toggleActive(group:Group) {
    const res=await fetch("/api/teacher/groups",{
      method:"PATCH",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({classId,groupId:group.id,isActive:!group.is_active})
    });
    const data=await res.json();
    if(!res.ok)return setError(data.error);
    await load();
  }
  async function reset(group:Group) {
    if (!confirm(`Reset password for ${group.group_name}? The old password will stop working.`)) return;
    const res = await fetch("/api/teacher/groups", {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({classId,groupId:group.id,resetPassword:true})
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setCredential({loginId:data.group.login_id,password:data.password});
    await load();
  }

  async function remove(group:Group) {
    if (!confirm(`Delete ${group.group_name}? This also deletes its attempts and scores.`)) return;
    const res=await fetch("/api/teacher/groups",{
      method:"DELETE",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({classId,groupId:group.id})
    });
    const data=await res.json();
    if(!res.ok) return setError(data.error);
    await load();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm sm:flex-row">
        <input value={groupName} onChange={e=>setGroupName(e.target.value)} placeholder="Group name"
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3" required />
        <button className="rounded-xl bg-sky-600 px-5 py-3 font-bold text-white">Add group</button>
      </form>

      {credential && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="font-bold text-emerald-900">New credentials</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-3"><span className="text-xs text-slate-500">Login ID</span><div className="font-mono font-bold">{credential.loginId}</div></div>
            <div className="rounded-xl bg-white p-3"><span className="text-xs text-slate-500">Password</span><div className="font-mono font-bold">{credential.password}</div></div>
          </div>
        </div>
      )}
      {error && <p className="rounded-xl bg-rose-50 p-3 text-rose-700">{error}</p>}

      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Group</th><th>Login ID</th><th>Login status</th><th>Total score</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>
            {groups.map(g=>(
              <tr key={g.id}>
                <td className="font-semibold">{g.group_name}</td>
                <td className="font-mono">{g.login_id}</td>
                <td>{g.last_login_at ? `Last login ${new Date(g.last_login_at).toLocaleString()}` : "Not logged in"}</td>
                <td className="font-black">{g.total_score}</td>
                <td>{g.is_active ? "Yes" : "No"}</td>
                <td className="space-x-2">
                  <button onClick={()=>void edit(g)} className="rounded-lg border px-3 py-2 text-xs font-bold">Edit</button>
                  <button onClick={()=>void toggleActive(g)} className="rounded-lg border px-3 py-2 text-xs font-bold">{g.is_active?"Deactivate":"Activate"}</button>
                  <button onClick={()=>void reset(g)} className="rounded-lg border px-3 py-2 text-xs font-bold">Reset password</button>
                  <button onClick={()=>void remove(g)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={`/api/teacher/export?classId=${classId}&type=credentials&format=csv`} className="rounded-xl border bg-white px-4 py-2 text-sm font-bold">Export credentials CSV</a>
        <a href={`/api/teacher/export?classId=${classId}&type=credentials&format=xlsx`} className="rounded-xl border bg-white px-4 py-2 text-sm font-bold">Export credentials Excel</a>
      </div>
    </div>
  );
}
