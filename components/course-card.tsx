import Image from "next/image"
import { Clock, BarChart } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CourseCardProps {
  title: string
  description: string
  level: string
  duration: string
  image: string
}

export default function CourseCard({ title, description, level, duration, image }: CourseCardProps) {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-md border border-slate-100 hover:shadow-lg transition-all duration-300 flex flex-col">
      <div className="relative h-48 w-full">
        <Image src={image || "/placeholder.svg"} alt={title} fill className="object-cover" />
      </div>
      <div className="p-6 flex-grow">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-slate-600 mb-4">{description}</p>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center text-sm text-slate-500">
            <BarChart className="h-4 w-4 mr-1" />
            {level}
          </div>
          <div className="flex items-center text-sm text-slate-500">
            <Clock className="h-4 w-4 mr-1" />
            {duration}
          </div>
        </div>
      </div>
      <div className="px-6 pb-6">
        <Button className="w-full bg-emerald-500 hover:bg-emerald-600">Explore Course</Button>
      </div>
    </div>
  )
}

