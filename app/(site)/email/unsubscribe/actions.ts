"use server"

import { redirect } from "next/navigation"

import { unsubscribeCampaign } from "@/lib/email/campaign-server"

export async function unsubscribeCampaignAction(formData: FormData) {
  const result = await unsubscribeCampaign(formData.get("t"))
  redirect(`/email/unsubscribe?done=${result}`)
}
