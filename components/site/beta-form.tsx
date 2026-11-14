"use client"

import { useActionState } from "react"

import { applyForBeta, type BetaApplyState } from "@/app/(site)/beta/actions"
import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { Label } from "@/components/site/ui/label"
import { Textarea } from "@/components/site/ui/textarea"
import { BETA_DEVICES, BETA_ROLES, type BetaApplication } from "@/lib/beta/options"

const select = "h-10 w-full rounded-md border bg-background px-3 text-sm"

/** The beta application (krpex.in/beta). `initial` fills it in again to change a waiting application. */
export function BetaForm({ name, initial }: { name: string; initial?: BetaApplication | null }) {
  const [state, formAction, pending] = useActionState<BetaApplyState, FormData>(applyForBeta, { status: "idle" })
  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="beta-name">Your name</Label>
        <Input id="beta-name" name="name" defaultValue={initial?.name ?? name} required maxLength={80} autoComplete="name" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
        <div className="grid gap-2">
          <Label htmlFor="beta-role">What describes you best?</Label>
          <select id="beta-role" name="role" required defaultValue={initial?.role ?? ""} className={select}>
            <option value="" disabled>
              Choose one
            </option>
            {BETA_ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="beta-device">Device you&apos;ll mostly use</Label>
          <select id="beta-device" name="device" required defaultValue={initial?.device ?? ""} className={select}>
            <option value="" disabled>
              Choose one
            </option>
            {BETA_DEVICES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="beta-goal">What would you like to learn or practise on Krpex?</Label>
        <Textarea
          id="beta-goal"
          name="goal"
          rows={4}
          required
          minLength={3}
          maxLength={500}
          defaultValue={initial?.goal ?? ""}
          placeholder="For example: Python for my college placements, or Class 12 Physics"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="beta-heard">
          <span>
            How did you hear about Krpex? <span className="font-normal text-muted-foreground">(optional)</span>
          </span>
        </Label>
        <Input id="beta-heard" name="heard_from" maxLength={200} defaultValue={initial?.heard_from ?? ""} />
      </div>
      <label className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
        <input type="checkbox" name="consent" required defaultChecked={Boolean(initial)} className="mt-0.5 size-4 shrink-0 accent-primary" />
        <span>
          I agree that, as a beta tester, Krpex records how I use krpex.in, Krpex Code and Krpex Community (pages I visit and what I do there) and records my
          sessions on screen, with everything I type hidden, to find problems and improve the product.
        </span>
      </label>
      <div className="flex flex-wrap items-center justify-end gap-4">
        {state.message && (
          <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-sm text-destructive-foreground" : "text-sm text-primary"}>
            {state.message}
          </p>
        )}
        <Button type="submit" disabled={pending} loading={pending}>
          {pending ? "Sending..." : initial ? "Save changes" : "Apply for the beta"}
        </Button>
      </div>
    </form>
  )
}
