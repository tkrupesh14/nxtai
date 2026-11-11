"use server"

import { z } from "zod"

import { communityError, LIMITS, REPORT_REASONS } from "@/lib/community/posts"
import { createClient } from "@/lib/supabase/server"

// Community 5b. Every rule is checked again in the database (migration 034); these only shape input and errors.

export type ActionResult = { ok?: boolean; error?: string; id?: string; score?: number }

const id = z.string().uuid()
const PostSchema = z.object({
  space: z.string().max(80),
  kind: z.enum(["solution", "discussion"]),
  title: z.string().max(LIMITS.title + 20),
  body: z.string().max(LIMITS.body + 100),
  code: z.string().max(LIMITS.code + 100).nullable(),
  language: z.enum(["python", "javascript"]).nullable(),
  spoiler: z.boolean(),
})

const KNOWN = /not_signed_in|need_|account_too_new|banned|links_need|bad_|solve_first|too_|locked|own_post|not_found/

async function call(fn: string, args: Record<string, unknown>): Promise<{ data?: unknown; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    if (!KNOWN.test(error.message)) console.error(`${fn} failed:`, error.message)
    return { error: communityError(error.message) }
  }
  return { data }
}

export async function savePostAction(input: z.input<typeof PostSchema> & { id?: string }): Promise<ActionResult> {
  const parsed = PostSchema.safeParse(input)
  if (!parsed.success) return { error: communityError("bad_body") }
  const p = parsed.data
  const code = p.code?.trim() ? p.code : null
  if (input.id) {
    if (!id.safeParse(input.id).success) return { error: communityError("not_found") }
    const r = await call("community_edit_post", { p_id: input.id, p_title: p.title, p_body: p.body, p_code: code, p_language: code ? p.language : null, p_spoiler: p.spoiler })
    return r.error ? r : { ok: true, id: input.id }
  }
  const r = await call("community_create_post", { p_space: p.space, p_kind: p.kind, p_title: p.title, p_body: p.body, p_code: code, p_language: code ? p.language : null, p_spoiler: p.spoiler })
  return r.error ? r : { ok: true, id: r.data as string }
}

export async function deletePostAction(postId: string): Promise<ActionResult> {
  if (!id.safeParse(postId).success) return { error: communityError("not_found") }
  const r = await call("community_delete_post", { p_id: postId })
  return r.error ? r : { ok: true }
}

export async function commentAction(postId: string, parentId: string | null, body: string): Promise<ActionResult> {
  if (!id.safeParse(postId).success || (parentId && !id.safeParse(parentId).success)) return { error: communityError("not_found") }
  if (!body.trim() || body.length > LIMITS.comment + 50) return { error: communityError("bad_body") }
  const r = await call("community_comment", { p_post: postId, p_parent: parentId, p_body: body })
  return r.error ? r : { ok: true, id: r.data as string }
}

export async function editCommentAction(commentId: string, body: string): Promise<ActionResult> {
  if (!id.safeParse(commentId).success) return { error: communityError("not_found") }
  if (!body.trim() || body.length > LIMITS.comment + 50) return { error: communityError("bad_body") }
  const r = await call("community_edit_comment", { p_id: commentId, p_body: body })
  return r.error ? r : { ok: true }
}

export async function deleteCommentAction(commentId: string): Promise<ActionResult> {
  if (!id.safeParse(commentId).success) return { error: communityError("not_found") }
  const r = await call("community_delete_comment", { p_id: commentId })
  return r.error ? r : { ok: true }
}

export async function voteAction(target: "post" | "comment", targetId: string, on: boolean): Promise<ActionResult> {
  if (!id.safeParse(targetId).success) return { error: communityError("not_found") }
  const r = await call("community_vote", { p_post: target === "post" ? targetId : null, p_comment: target === "comment" ? targetId : null, p_on: on })
  return r.error ? r : { ok: true, score: Number(r.data) }
}

export async function reportAction(target: "post" | "comment", targetId: string, reason: string, note: string): Promise<ActionResult> {
  if (!id.safeParse(targetId).success) return { error: communityError("not_found") }
  if (!REPORT_REASONS.some((r) => r.value === reason)) return { error: communityError("bad_reason") }
  const r = await call("community_report", {
    p_post: target === "post" ? targetId : null,
    p_comment: target === "comment" ? targetId : null,
    p_reason: reason,
    p_note: note.slice(0, LIMITS.note),
  })
  return r.error ? r : { ok: true }
}
