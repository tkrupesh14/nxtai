import "server-only"

import { cache } from "react"

import type { BoardStats } from "@/lib/community/boards"
import type { FeedPost, MyCommunityStatus, PostKind, PostList, Thread } from "@/lib/community/posts"
import type { MyPublicProfile, PublicProfile } from "@/lib/community/profile"
import { createClient } from "@/lib/supabase/server"

// Community reads (migrations 033–035). Each returns an empty answer if the migration isn't applied yet.

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

/** A space's posts of one kind (locked solutions come back with counts only). */
export async function getPostList(space: string, kind: PostKind, sort: "top" | "new" = "top", limit = 20, offset = 0): Promise<PostList> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("community_list", { p_space: space, p_kind: kind, p_sort: sort, p_limit: limit, p_offset: offset })
  if (error || !data) return { locked: kind === "solution", posts: [], counts: { solution: 0, discussion: 0 } }
  return data as PostList
}

/** One post with its comments, or null. */
export const getThread = cache(async (id: string): Promise<Thread | null> => {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("community_thread", { p_id: id })
  return error || !data ? null : (data as Thread)
})

/** Whether the signed-in learner can post, or why not. */
export async function getMyCommunityStatus(): Promise<MyCommunityStatus> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("community_my_status")
  return error || !data ? { can_post: false, reason: "not_signed_in" } : (data as MyCommunityStatus)
}

/** Active boards with post counts and last activity (migration 035). */
export async function getBoardStats(): Promise<BoardStats[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("community_boards")
  return error || !Array.isArray(data) ? [] : (data as BoardStats[])
}

/** Most recently active discussions: everything, Code's (problems + general boards) or the course boards. */
export async function getFeed(scope: "code" | "courses" | null = null, limit = 20, offset = 0): Promise<FeedPost[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("community_feed", { p_scope: scope, p_limit: limit, p_offset: offset })
  return error || !Array.isArray(data) ? [] : (data as FeedPost[])
}
