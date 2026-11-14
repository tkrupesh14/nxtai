// The last few browser errors on this page (components/error-reporter.tsx), sent along with feedback (beta B.2).
export type RecentError = { message: string; at: string }

const errors: RecentError[] = []

export function rememberError(message: string) {
  errors.push({ message: message.slice(0, 300), at: new Date().toISOString() })
  if (errors.length > 5) errors.shift()
}

export const recentErrors = (): RecentError[] => errors.slice()
