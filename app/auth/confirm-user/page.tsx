"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ConfirmUser() {
  const router = useRouter()

  const handleOpenGmail = () => {
    window.open("https://mail.google.com", "_blank")
  }

  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-900/30 border border-emerald-700/50 text-emerald-400 mb-4">
        <Mail className="h-5 w-5" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Check your email</h1>
      <p className="text-zinc-400 mb-6">
        We've sent a password reset link to your email address. Please check your inbox.
      </p>
      <div className="flex flex-col gap-2 justify-center items-center">
        <Button
          onClick={handleOpenGmail}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          Open Gmail
        </Button>
      </div>
    </motion.div>
  )
}
