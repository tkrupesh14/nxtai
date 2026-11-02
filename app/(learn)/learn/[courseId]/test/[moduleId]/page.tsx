import { AssessmentPage } from "@/components/learn/assessment-page"

export const metadata = { title: "Module test" }

export default async function ModuleTestPage({ params }: { params: Promise<{ courseId: string; moduleId: string }> }) {
  const { courseId, moduleId } = await params
  return <AssessmentPage courseId={courseId} moduleId={moduleId} />
}
