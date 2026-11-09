"use server"

import { revalidatePath } from "next/cache"

import { planBySlug } from "@/lib/code/plans"
import { createClient } from "@/lib/supabase/server"

export type FollowResult = { ok: true } | { ok: false; message: string }

/** Follow or unfollow a study plan (migration 032). Following a finished plan pays its bonus if it wasn't paid. */
export async function followPlanAction(slug: string, follow: boolean): Promise<FollowResult> {
  if (!planBySlug(slug)) return { ok: false, message: "This plan isn't available." }
  const supabase = await createClient()
  const { error } = await supabase.rpc("follow_coding_plan", { p_plan: slug, p_follow: Boolean(follow) })
  if (error) {
    if (/not_signed_in/.test(error.message)) return { ok: false, message: "Log in to follow a plan." }
    if (/too_many_plans/.test(error.message)) return { ok: false, message: "You can follow up to 5 plans. Unfollow one first." }
    console.error("follow_coding_plan failed:", error.message)
    return { ok: false, message: "Something went wrong. Please try again." }
  }
  revalidatePath("/code", "layout")
  return { ok: true }
}
