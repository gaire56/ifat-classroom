import { TeacherShell } from "@/components/TeacherShell";
import { ClassSettingsClient } from "@/components/ClassSettingsClient";
import { OverviewClient } from "@/components/OverviewClient";

export default async function ClassPage({params}:{params:Promise<{classId:string}>}){
  const {classId}=await params;
  return <TeacherShell classId={classId}>
    <div className="space-y-6">
      <ClassSettingsClient classId={classId}/>
      <OverviewClient classId={classId}/>
    </div>
  </TeacherShell>;
}
