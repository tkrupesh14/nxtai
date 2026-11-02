import { AssessmentPage } from "@/components/learn/assessment-page"

export const metadata = { title: "Final exam" }

export default async function FinalExamPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  return <AssessmentPage courseId={courseId} moduleId={null} />
}
