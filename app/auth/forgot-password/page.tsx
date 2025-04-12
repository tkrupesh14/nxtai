"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Loader2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useForm } from "react-hook-form"

interface ForgotPasswordFormData {
  email: string
}

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    defaultValues: {
      email: "",
    },
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    setErrorMessage("")

  }

  return (
    <div className="max-w-md mx-auto">
      <Link
        href="/auth/login"
        className="inline-flex items-center text-sm text-zinc-400 hover:text-zinc-300 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to login
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-zinc-900/50 backdrop-blur-sm p-8 rounded-xl border border-zinc-800 shadow-lg"
      >
        {!isSubmitted ? (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-violet-900/30 border border-violet-700/50 text-violet-400 mb-4">
                <Mail className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Forgot your password?</h1>
              <p className="text-zinc-400">No problem. Enter your email and we'll send you a reset link.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className={`bg-zinc-900 border-zinc-700 focus:border-violet-500 ${errors.email ? "border-rose-500" : ""}`}
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address",
                    },
                  })}
                />
                {errors.email && <p className="text-rose-500 text-sm mt-1">{errors.email.message}</p>}
              </div>

              {errorMessage && (
                <p className="text-rose-500 text-sm text-center -mt-2">{errorMessage}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-violet-600 hover:bg-violet-700 text-white group relative overflow-hidden"
                disabled={isLoading}
              >
                <span className="relative z-10 flex items-center">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending reset link...
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </span>
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-violet-600 to-violet-500"></span>
                <span className="absolute bottom-0 left-0 w-full h-0 bg-gradient-to-r from-fuchsia-600 to-violet-600 transition-all duration-300 group-hover:h-full"></span>
              </Button>
            </form>
          </>
        ) : (
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
            <Button
              onClick={() => setIsSubmitted(false)}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Back to reset password
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
