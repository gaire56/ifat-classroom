import { TeacherShell } from "@/components/TeacherShell";
import { GroupManager } from "@/components/GroupManager";
export default async function GroupsPage({params}:{params:Promise<{classId:string}>}){
  const {classId}=await params;
  return <TeacherShell classId={classId}><div className="mb-6"><h1 className="text-3xl font-black">Group management</h1><p className="text-slate-500">Generate persistent group credentials for the full five-day class.</p></div><GroupManager classId={classId}/></TeacherShell>;
}
