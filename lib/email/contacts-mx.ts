import "server-only"

import { Resolver } from "node:dns/promises"

/**
 * Which domains can receive mail: an MX record, or (with none) an address record. Domains that don't exist
 * are dropped; lookups that time out or fail for other reasons are kept, so a slow DNS server never drops people.
 */
export async function domainsWithoutMail(domains: string[]): Promise<Set<string>> {
  const resolver = new Resolver({ timeout: 4000, tries: 2 })
  const bad = new Set<string>()
  const queue = [...new Set(domains)]
  const worker = async () => {
    for (let d = queue.shift(); d; d = queue.shift()) {
      try {
        const mx = await resolver.resolveMx(d)
        if (mx.length === 0 || mx.every((m) => !m.exchange || m.exchange === ".")) bad.add(d)
      } catch (e) {
        const code = (e as { code?: string }).code
        if (code === "ENOTFOUND") bad.add(d)
        else if (code === "ENODATA") await resolver.resolve4(d).catch(() => bad.add(d))
      }
    }
  }
  await Promise.all(Array.from({ length: 10 }, worker))
  return bad
}
