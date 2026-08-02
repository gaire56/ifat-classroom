import { TeacherShell } from "@/components/TeacherShell";
import { ResultsClient } from "@/components/ResultsClient";
export default async function ResultsPage({params}:{params:Promise<{classId:string}>}){
  const {classId}=await params;
  return <TeacherShell classId={classId}><ResultsClient classId={classId}/></TeacherShell>;
}
