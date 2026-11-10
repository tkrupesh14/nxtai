import "server-only"

import { cache } from "react"

import type { MyPublicProfile, PublicProfile } from "@/lib/community/profile"
import { createClient } from "@/lib/supabase/server"

// Community reads (migration 033). Each returns an empty answer if the migration isn't applied yet.

/** The signed-in learner's own profile settings, or null if they haven't claimed a handle. */
export async function getMyPublicProfile(): Promise<MyPublicProfile | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("public_profiles")
    .select("handle, display_name, bio, is_public, show_solves, hidden, handle_changed_at")
    .maybeSingle()
  return error ? null : ((data as MyPublicProfile | null) ?? null)
}

/** A public profile page's data, or null when unknown, private or hidden. */
export const getPublicProfile = cache(async (handle: string): Promise<PublicProfile | null> => {
  if (!handle || handle.length > 20) return null
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("public_profile", { p_handle: handle })
  if (error || !data) return null
  return data as PublicProfile
})

/** Handles of public profiles, for the sitemap. */
export async function getPublicHandles(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("public_profile_handles")
  return error || !Array.isArray(data) ? [] : (data as string[])
}
