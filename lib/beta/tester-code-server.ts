import "server-only"

import { createHash } from "node:crypto"

/** Server version of testerCode (lib/beta/tester-code.ts), for the admin pages. */
export const testerCodeSync = (userId: string) => `t-${createHash("sha256").update(userId).digest("hex").slice(0, 10)}`
