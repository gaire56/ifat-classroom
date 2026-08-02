import { TeacherShell } from "@/components/TeacherShell";
import { QuestionManager } from "@/components/QuestionManager";
export default async function QuestionsPage({params}:{params:Promise<{classId:string}>}){
  const {classId}=await params;
  return <TeacherShell classId={classId}><div className="mb-6"><h1 className="text-3xl font-black">Question control</h1><p className="text-slate-500">Set only day, question number, and private correct option. One question can be active at a time.</p></div><QuestionManager classId={classId}/></TeacherShell>;
}
