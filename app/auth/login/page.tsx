"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { account, OAuthProvider } from "@/lib/appwrite"

interface LoginFormData {
  email: string
  password: string
  rememberMe: boolean
}

export default function LoginPage() {
    const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setErrorMessage("") // Reset any previous error
  
    try {
      const { email, password } = data
      await account.createEmailPasswordSession(email, password)
      router.push("/dashboard") // Redirect to home
    } catch (error: any) {
      console.error("Login error:", error)
      setErrorMessage(error?.message || "Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }
  const handleOAuthLogin = async () => {
    try {
      await account.createOAuth2Session(
        OAuthProvider.Github,
        `${window.location.origin}/dashboard`, // success redirect URL
        `${window.location.origin}/auth/login`,
        ['repo', 'user'] // Scopes you want to request
      )
    } catch (error) {
      console.error("OAuth login error:", error)
      alert("GitHub login failed. Please try again.")
    }
  }
  

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
      {/* Left Column - Form */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
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
              Welcome back
            </motion.h1>
            <motion.p
              className="text-zinc-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              Enter your credentials to access your account
            </motion.p>
          </div>

          <AuthFormToggle currentPath="/auth/login" />

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
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-violet-500 transition-all duration-300 group-hover:w-full"></span>
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
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
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
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className={`bg-zinc-900 border-zinc-700 focus:border-violet-500 ${errors.password ? "border-rose-500" : ""}`}
                  {...register("password", {
                    required: "Password is required",
                    
                    minLength: {
                      value: 8,
                      message: "Password must be at least 8 characters",
                    },
                  })}
                />
                {errors.password && <p className="text-rose-500 text-sm mt-1">{errors.password.message}</p>}
                {errorMessage && <p className="text-rose-500 text-sm mt-1">{errorMessage}</p>}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="remember" {...register("rememberMe")} />
              <Label htmlFor="remember" className="text-sm font-normal">
                Remember me for 30 days
              </Label>
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
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </span>
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-violet-600 to-violet-500"></span>
              <span className="absolute bottom-0 left-0 w-full h-0 bg-gradient-to-r from-fuchsia-600 to-violet-600 transition-all duration-300 group-hover:h-full"></span>
            </Button>
          </motion.form>

          <motion.p
            className="text-center text-sm text-zinc-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Don't have an account?{" "}
            <Link href="/auth/signup" className="text-violet-400 hover:text-violet-300 transition-colors">
              Sign up
            </Link>
          </motion.p>
        </div>
      </motion.div>

      {/* Right Column - Illustration */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7 }}
        className="hidden lg:block"
      >
        <AuthIllustration type="login" />
      </motion.div>
    </div>
  )
}

