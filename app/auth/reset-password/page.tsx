"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Loader2, Lock, Check, AlertCircle, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useForm } from "react-hook-form"


interface ResetPasswordFormData {
  password: string
  confirmPassword: string
}

export default function ResetPasswordPage() {
    const searchParams = useSearchParams()
const userId = searchParams.get("userId")
const secret = searchParams.get("secret")

  const router = useRouter()


  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false)
  const [tokenValid, setTokenValid] = useState(true)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  const password = watch("password")

  // Validate token on mount
  useEffect(() => {
    if (!secret || !userId) {
      setTokenValid(false)
      return
    }

    // In a real app, you would validate the token with your backend
    // This is just a simulation
    const validateToken = async () => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // For demo purposes, we'll consider any token valid
      // In a real app, you would check if the token is valid
      setTokenValid(true)
    }

    validateToken()
  }, [secret, userId])

  // Calculate password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0)
      return
    }

    let strength = 0

    // Length check
    if (password.length >= 8) strength += 20

    // Contains lowercase
    if (/[a-z]/.test(password)) strength += 20

    // Contains uppercase
    if (/[A-Z]/.test(password)) strength += 20

    // Contains number
    if (/[0-9]/.test(password)) strength += 20

    // Contains special character
    if (/[^A-Za-z0-9]/.test(password)) strength += 20

    setPasswordStrength(strength)
  }, [password])

  const getStrengthColor = () => {
    if (passwordStrength < 40) return "bg-rose-500"
    if (passwordStrength < 80) return "bg-amber-500"
    return "bg-emerald-500"
  }

  const getStrengthText = () => {
    if (passwordStrength < 40) return "Weak"
    if (passwordStrength < 80) return "Medium"
    return "Strong"
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (data.password !== data.confirmPassword) {
      return
    }
  
    if (!userId || !secret) {
      setTokenValid(false)
      return
    }
  
    setIsLoading(true)
  
   
  }
  

  // If token is invalid, show error
  if (tokenValid === false) {
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
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-900/30 border border-rose-700/50 text-rose-400 mb-4">
              <AlertCircle className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Invalid or Expired Link</h1>
            <p className="text-zinc-400">
              The password reset link is invalid or has expired. Please request a new password reset link.
            </p>
          </div>

          <Button
            onClick={() => router.push("/auth/forgot-password")}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white group relative overflow-hidden"
          >
            <span className="relative z-10">Request New Link</span>
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-violet-600 to-violet-500"></span>
            <span className="absolute bottom-0 left-0 w-full h-0 bg-gradient-to-r from-fuchsia-600 to-violet-600 transition-all duration-300 group-hover:h-full"></span>
          </Button>
        </motion.div>
      </div>
    )
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
        {!isSuccess ? (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-violet-900/30 border border-violet-700/50 text-violet-400 mb-4">
                <Lock className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Reset Your Password</h1>
              <p className="text-zinc-400">Enter a new password for your account.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={passwordVisible ? "text" : "password"}
                    placeholder="••••••••"
                    className={`bg-zinc-900 border-zinc-700 focus:border-violet-500 pr-10 ${errors.password ? "border-rose-500" : ""}`}
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 8,
                        message: "Password must be at least 8 characters",
                      },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                        message: "Password must include uppercase, lowercase, number and special character",
                      },
                    })}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                  >
                    {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-rose-500 text-sm mt-1">{errors.password.message}</p>}

                {/* Password strength meter */}
                {password && (
                  <div className="space-y-1 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">Password strength:</span>
                      <span
                        className={`text-xs font-medium ${
                          passwordStrength < 40
                            ? "text-rose-500"
                            : passwordStrength < 80
                              ? "text-amber-500"
                              : "text-emerald-500"
                        }`}
                      >
                        {getStrengthText()}
                      </span>
                    </div>
                    <Progress value={passwordStrength} className="h-1.5 bg-zinc-800">
                      <div className={`h-full ${getStrengthColor()}`} style={{ width: `${passwordStrength}%` }} />
                    </Progress>
                  </div>
                )}

                <p className="text-xs text-zinc-500 mt-2">
                  Password must be at least 8 characters and include uppercase, lowercase, number and special character
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={confirmPasswordVisible ? "text" : "password"}
                    placeholder="••••••••"
                    className={`bg-zinc-900 border-zinc-700 focus:border-violet-500 pr-10 ${
                      errors.confirmPassword ||
                      (password && watch("confirmPassword") && password !== watch("confirmPassword"))
                        ? "border-rose-500"
                        : ""
                    }`}
                    {...register("confirmPassword", {
                      required: "Please confirm your password",
                      validate: (value) => value === password || "Passwords do not match",
                    })}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                    onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                  >
                    {confirmPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-rose-500 text-sm mt-1">{errors.confirmPassword.message}</p>
                )}
                {password && watch("confirmPassword") && password !== watch("confirmPassword") && (
                  <p className="text-rose-500 text-sm mt-1">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-violet-600 hover:bg-violet-700 text-white group relative overflow-hidden"
                disabled={isLoading}
              >
                <span className="relative z-10 flex items-center">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Resetting password...
                    </>
                  ) : (
                    "Reset Password"
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
              <Check className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Password Reset Successfully</h1>
            <p className="text-zinc-400 mb-6">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <Button
              onClick={() => router.push("/auth/login")}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white group relative overflow-hidden"
            >
              <span className="relative z-10">Go to Login</span>
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-emerald-600 to-emerald-500"></span>
              <span className="absolute bottom-0 left-0 w-full h-0 bg-gradient-to-r from-teal-600 to-emerald-600 transition-all duration-300 group-hover:h-full"></span>
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

