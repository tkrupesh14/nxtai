"use client"

import Link from "next/link"
import { motion } from "framer-motion"

interface AuthFormToggleProps {
  currentPath: string
}

export default function AuthFormToggle({ currentPath }: AuthFormToggleProps) {
  const isLogin = currentPath === "/auth/login"

  return (
    <div className="bg-zinc-900 p-1 rounded-lg border border-zinc-800 flex">
      <Link
        href="/auth/login"
        className={`flex-1 py-2 text-center text-sm rounded-md transition-all duration-200 relative ${
          isLogin ? "text-white" : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        Sign In
        {isLogin && (
          <motion.div
            layoutId="auth-tab-indicator"
            className="absolute inset-0 bg-zinc-800 rounded-md -z-10"
            transition={{ type: "spring", duration: 0.5 }}
          />
        )}
      </Link>
      <Link
        href="/auth/signup"
        className={`flex-1 py-2 text-center text-sm rounded-md transition-all duration-200 relative ${
          !isLogin ? "text-white" : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        Sign Up
        {!isLogin && (
          <motion.div
            layoutId="auth-tab-indicator"
            className="absolute inset-0 bg-zinc-800 rounded-md -z-10"
            transition={{ type: "spring", duration: 0.5 }}
          />
        )}
      </Link>
    </div>
  )
}

