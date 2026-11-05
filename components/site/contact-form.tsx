"use client"

import { useActionState, useEffect, useRef } from "react"

import { sendContactMessage, type ContactState } from "@/app/(site)/contact/actions"
import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { Label } from "@/components/site/ui/label"
import { Textarea } from "@/components/site/ui/textarea"

// Saves to the Supabase `contact_messages` table (supabase/migrations).
export function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, pending] = useActionState<ContactState, FormData>(sendContactMessage, { status: "idle" })

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="grid gap-6">
      <div className="grid gap-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" placeholder="Your name" required maxLength={200} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input type="email" id="email" name="email" placeholder="you@example.com" required maxLength={320} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" placeholder="How can we help?" rows={6} required minLength={5} maxLength={5000} />
      </div>
      {/* Honeypot for bots; hidden from people and screen readers. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="flex items-center justify-end gap-4">
        {state.message && (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={state.status === "error" ? "text-sm text-destructive-foreground" : "text-sm text-primary"}
          >
            {state.message}
          </p>
        )}
        <Button type="submit" disabled={pending} loading={pending}>
          {pending ? "Sending..." : "Send message"}
        </Button>
      </div>
    </form>
  )
}
