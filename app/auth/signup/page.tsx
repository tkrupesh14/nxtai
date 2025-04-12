"use client"

import { useState } from "react"
import {useRouter} from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Github, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useForm } from "react-hook-form"
import AuthFormToggle from "@/components/auth-form-toggle"
import AuthIllustration from "@/components/auth-illustration"
import {signup} from './actions'

interface SignupFormData {
  name: string
  email: string
  password: string
}

export default function SignupPage() {
    const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    defaultValues: {
      name: "",
      email: "",
      password: ""
    },
  })

  const handleOAuthLogin = async () => {
    
  }
  
  

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
      {/* Left Column - Illustration */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7 }}
        className="hidden lg:block"
      >
        <AuthIllustration type="signup" />
      </motion.div>

      {/* Right Column - Form */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-auto"
      >
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <motion.h1
              className="text-3xl font-bold"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              Create your account
            </motion.h1>
            <motion.p
              className="text-zinc-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              Start your journey to mastering prompt engineering
            </motion.p>
          </div>

          <AuthFormToggle currentPath="/auth/signup" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Button
              variant="outline"
              className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 relative overflow-hidden group"
              onClick={handleOAuthLogin}
            >
              <Github className="h-4 w-4 mr-2" />
              <span className="relative z-10">Continue with GitHub</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-500 transition-all duration-300 group-hover:w-full"></span>
            </Button>
          </motion.div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-700"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-black px-2 text-zinc-500">Or continue with</span>
            </div>
          </div>

          <motion.form
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  className={`bg-zinc-900 border-zinc-700 focus:border-emerald-500 ${errors.name ? "border-rose-500" : ""}`}
                  {...register("name", {
                    required: "Name is required",
                    minLength: {
                      value: 2,
                      message: "Name must be at least 2 characters",
                    },
                  })}
                />
                {errors.name && <p className="text-rose-500 text-sm mt-1">{errors.name.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className={`bg-zinc-900 border-zinc-700 focus:border-emerald-500 ${errors.email ? "border-rose-500" : ""}`}
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className={`bg-zinc-900 border-zinc-700 focus:border-emerald-500 ${errors.password ? "border-rose-500" : ""}`}
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
                {errors.password && <p className="text-rose-500 text-sm mt-1">{errors.password.message}</p>}
              </div>
              <p className="text-xs text-zinc-500">
                Password must be at least 8 characters and include uppercase, lowercase, number and special character
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white group relative overflow-hidden"
              disabled={isLoading}
              formAction={signup}
            >
              <span className="relative z-10 flex items-center">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create account
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </span>
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-emerald-600 to-emerald-500"></span>
              <span className="absolute bottom-0 left-0 w-full h-0 bg-gradient-to-r from-teal-600 to-emerald-600 transition-all duration-300 group-hover:h-full"></span>
            </Button>
          </motion.form>

          <motion.p
            className="text-center text-sm text-zinc-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Already have an account?{" "}
            <Link href="/auth/login" className="text-emerald-400 hover:text-emerald-300 transition-colors">
              Sign in
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  )
}

