import { cache } from "react"
import { redirect } from "next/navigation"
import type { SupabaseClient, User } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"

/** Best display name we can derive from an auth user (email sign-up, GitHub or Google). */
export function displayNameFor(user: User): string {
  const meta = user.user_metadata ?? {}
  const name = meta.full_name || meta.name || meta.user_name || meta.preferred_username
  if (typeof name === "string" && name.trim()) return name.trim()
  return user.email?.split("@")[0] ?? "User"
}

/**
 * Make sure the `public.users` profile row exists. The on_auth_user_created trigger
 * normally creates it (email and OAuth sign-ups); this is a fallback for older accounts.
 * Safe to call repeatedly: a duplicate insert (23505) is ignored.
 */
export async function ensureProfile(supabase: SupabaseClient, user: User) {
  const { data } = await supabase.from("users").select("id").eq("id", user.id).maybeSingle()
  if (data) return
  const now = new Date().toISOString()
  const { error } = await supabase
    .from("users")
    .insert({ id: user.id, full_name: displayNameFor(user), created_at: now, updated_at: now })
  if (error && error.code !== "23505") {
    console.error("Could not create users profile row:", error.message)
  }
}

/**
 * Signed-in user plus their profile, deduplicated per request (header, sidebar and
 * welcome banner all call it). Redirects to /login when there is no session.
 * Never bounces a signed-in user just because the profile row is missing: it tries
 * to create it, then falls back to the name from the auth metadata.
 */
/** The signed-in user or null, fetched once per request (navbar and page share it). */
export const getSignedInUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

export const getCurrentProfile = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/learn")

  let { data: profile } = await supabase.from("users").select("full_name").eq("id", user.id).maybeSingle()
  if (!profile) {
    await ensureProfile(supabase, user)
    ;({ data: profile } = await supabase.from("users").select("full_name").eq("id", user.id).maybeSingle())
  }

  const avatar = user.user_metadata?.avatar_url
  return {
    user,
    profile: {
      full_name: profile?.full_name || displayNameFor(user),
      avatar_url: typeof avatar === "string" ? avatar : undefined,
    },
  }
})

export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "U"
  if (words.length === 1) return words[0][0].toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}
