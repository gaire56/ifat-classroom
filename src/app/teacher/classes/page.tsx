import { TeacherShell } from "@/components/TeacherShell";
import { ClassesManager } from "@/components/ClassesManager";
export default function ClassesPage(){return <TeacherShell><div className="mb-6"><h1 className="text-3xl font-black">Classes</h1><p className="text-slate-500">Each class automatically receives Day 1 through Day 5.</p></div><ClassesManager/></TeacherShell>}
