import "server-only"

/** Key proving a Supabase RPC call comes from our server (see migration 008). Never send it to the browser. */
export function serverKey(): string {
  const key = process.env.SERVER_RPC_KEY
  if (!key) throw new Error("SERVER_RPC_KEY is not set")
  return key
}
