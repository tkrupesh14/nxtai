// Closed beta (migration 041): the application's choices and shapes, shared by the form and the server.

export type BetaRole = "school" | "college" | "working" | "teacher" | "other"
export type BetaDevice = "android" | "iphone" | "computer" | "tablet"
export type BetaApplication = {
  status: "waiting" | "approved" | "declined"
  name: string
  role: BetaRole
  goal: string
  device: BetaDevice
  heard_from: string | null
  created_at: string
  decided_at: string | null
}
export type BetaStatus = { closed: boolean; signed_in: boolean; access: boolean; beta_tester: boolean; application: BetaApplication | null }

export const BETA_ROLES: { id: BetaRole; label: string }[] = [
  { id: "school", label: "School student" },
  { id: "college", label: "College student" },
  { id: "working", label: "Working" },
  { id: "teacher", label: "Teacher" },
  { id: "other", label: "Something else" },
]
export const BETA_DEVICES: { id: BetaDevice; label: string }[] = [
  { id: "android", label: "Android phone" },
  { id: "iphone", label: "iPhone" },
  { id: "computer", label: "Laptop or desktop" },
  { id: "tablet", label: "Tablet" },
]
