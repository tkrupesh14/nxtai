"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { LEVEL_LABELS, STYLE_LABELS, TIMELINE_LABELS } from "@/lib/learning/labels"
import { createClient } from "@/lib/supabase/server"

export type FormState = { ok?: boolean; error?: string }

const keys = <T extends Record<string, string>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]]

const ProfileSchema = z.object({
  full_name: z.string().trim().min(1, "Please enter your name.").max(80, "Please keep your name under 80 characters."),
})

export async function updateName(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = ProfileSchema.safeParse({ full_name: formData.get("full_name") })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/account")
  const { error } = await supabase
    .from("users")
    .update({ full_name: parsed.data.full_name, updated_at: new Date().toISOString() })
    .eq("id", user.id)
  if (error) {
    console.error("updateName failed:", error.message)
    return { error: "Couldn't save your name. Please try again." }
  }
  revalidatePath("/", "layout")
  return { ok: true }
}

const LearningSchema = z.object({
  level: z.enum(keys(LEVEL_LABELS)),
  background: z.string().trim().max(1000, "Please keep your background under 1000 characters."),
  hours_per_week: z.coerce.number().int().min(1, "At least 1 hour a week.").max(80, "At most 80 hours a week."),
  learning_style: z.enum(keys(STYLE_LABELS)),
  timeline: z.enum(keys(TIMELINE_LABELS)),
  language: z.enum(["en", "hi"]),
})

/** Learning preferences, used for every new course and lesson. The row is created during onboarding. */
export async function updateLearning(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = LearningSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("learner_profiles")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .not("user_id", "is", null)
    .select("user_id")
  if (error) {
    console.error("updateLearning failed:", error.message)
    return { error: "Couldn't save your preferences. Please try again." }
  }
  if (!data?.length) return { error: "Create your first course to set up your learning profile." }
  revalidatePath("/account")
  return { ok: true }
}

/** Sign out on every device (revokes all refresh tokens), then this one. */
export async function signOutEverywhere() {
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: "global" })
  redirect("/login")
}

/** Permanently delete the account and all its data (courses, lessons, chats cascade). */
export async function deleteAccount(_: FormState, formData: FormData): Promise<FormState> {
  if (String(formData.get("confirm") ?? "").trim() !== "DELETE") return { error: 'Type DELETE in capitals to confirm.' }
  const supabase = await createClient()
  const { error } = await supabase.rpc("delete_my_account")
  if (error) {
    console.error("delete_my_account failed:", error.message)
    return { error: "Couldn't delete your account. Please try again or contact support." }
  }
  await supabase.auth.signOut()
  redirect("/?deleted=1")
}
