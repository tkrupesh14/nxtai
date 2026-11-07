"use server"

import { redirect } from "next/navigation"

import { unsubscribe } from "@/lib/email/unsubscribe"

export async function unsubscribeAction(formData: FormData) {
  const result = await unsubscribe(formData.get("t"))
  redirect(`/unsubscribe?done=${result}`)
}
