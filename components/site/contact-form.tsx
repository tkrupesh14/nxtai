"use client"

import { useState, type FormEvent } from "react"

import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { Label } from "@/components/site/ui/label"
import { Textarea } from "@/components/site/ui/textarea"

// Mirrors nxtai.in: no backend yet — shows "Sending..." briefly, then clears the form.
// TODO: wire this to a real endpoint (e.g. a Supabase table or email service).
export function ContactForm() {
  const [sending, setSending] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setSending(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 900))
      form.reset()
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <div className="grid gap-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" placeholder="Your name" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input type="email" id="email" name="email" placeholder="you@example.com" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" placeholder="How can we help?" rows={6} required />
      </div>
      <div className="flex items-center justify-end">
        <Button type="submit" disabled={sending}>
          {sending ? "Sending..." : "Send message"}
        </Button>
      </div>
    </form>
  )
}
