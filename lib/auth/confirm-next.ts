import { safeNext } from "@/lib/safe-next"

/**
 * Where /auth/confirm sends someone after an email link. The templates (supabase/templates) pass Supabase's
 * {{ .RedirectTo }} as `next`: that's the emailRedirectTo the app asked for, a full URL like
 * https://krpex.in/auth/callback?next=%2Fonboarding&flow=signup, so we take its own `next`. Only same-site paths.
 */
export function confirmNext(next: string | null, type: string | null, origin: string): string {
  const fallback = type === "recovery" ? "/reset-password" : type === "email_change" ? "/account" : "/learn"
  if (!next) return fallback
  if (next.startsWith("/")) return safeNext(next, fallback)
  try {
    const url = new URL(next)
    if (url.origin !== origin) return fallback
    const inner = url.searchParams.get("next")
    if (inner) return safeNext(inner, fallback)
    return url.pathname === "/" || url.pathname.startsWith("/auth/") ? fallback : safeNext(url.pathname + url.search, fallback)
  } catch {
    return fallback
  }
}
