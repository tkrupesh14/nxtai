/**
 * Web Push with Node's own crypto (9.4): message encryption (RFC 8291, aes128gcm) and VAPID sign-in to the
 * push service (RFC 8292). No library. Tested against the RFC 8291 example in tests/unit/webpush.test.ts.
 */
import { createECDH, createHmac, createCipheriv, createPrivateKey, randomBytes, sign } from "node:crypto"

export type PushDevice = { endpoint: string; p256dh: string; auth: string }

const b64u = (b: Buffer) => b.toString("base64url")
const unb64u = (s: string) => Buffer.from(s, "base64url")
const hmac = (key: Buffer, data: Buffer) => createHmac("sha256", key).update(data).digest()

/** Only the big browser push services; anything else is never contacted. Same list as migration 025. */
export const PUSH_ENDPOINT =
  /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)\//

/**
 * Encrypt a message for one device. `asPrivate` and `salt` are only passed by tests; normally they are random.
 * Returns the request body: header (salt, record size, our public key) + one encrypted record.
 */
export function encryptPayload(
  payload: Buffer,
  device: { p256dh: string; auth: string },
  opts: { asPrivate?: Buffer; salt?: Buffer } = {},
): Buffer {
  const uaPublic = unb64u(device.p256dh)
  const authSecret = unb64u(device.auth)
  if (uaPublic.length !== 65 || authSecret.length !== 16) throw new Error("bad device keys")

  const ecdh = createECDH("prime256v1")
  if (opts.asPrivate) ecdh.setPrivateKey(opts.asPrivate)
  else ecdh.generateKeys()
  const asPublic = ecdh.getPublicKey()
  const sharedSecret = ecdh.computeSecret(uaPublic)
  const salt = opts.salt ?? randomBytes(16)

  // HKDF (RFC 5869) with SHA-256; every output here is at most 32 bytes, so one round of Expand is enough.
  const prkKey = hmac(authSecret, sharedSecret)
  const ikm = hmac(prkKey, Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic, Buffer.from([1])]))
  const prk = hmac(salt, ikm)
  const cek = hmac(prk, Buffer.from("Content-Encoding: aes128gcm\0\x01")).subarray(0, 16)
  const nonce = hmac(prk, Buffer.from("Content-Encoding: nonce\0\x01")).subarray(0, 12)

  const cipher = createCipheriv("aes-128-gcm", cek, nonce)
  // 0x02 marks the last (and only) record; no padding.
  const encrypted = Buffer.concat([cipher.update(Buffer.concat([payload, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()])

  const recordSize = Buffer.alloc(4)
  recordSize.writeUInt32BE(4096)
  return Buffer.concat([salt, recordSize, Buffer.from([asPublic.length]), asPublic, encrypted])
}

/** VAPID: a short-lived ES256 token proving the push comes from us. */
export function vapidAuthorization(endpoint: string, keys: { publicKey: string; privateKey: string; subject: string }, now = Date.now()) {
  const pub = unb64u(keys.publicKey)
  const key = createPrivateKey({
    key: { kty: "EC", crv: "P-256", d: keys.privateKey, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) },
    format: "jwk",
  })
  const header = b64u(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })))
  const claims = b64u(
    Buffer.from(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: keys.subject })),
  )
  const signature = sign("sha256", Buffer.from(`${header}.${claims}`), { key, dsaEncoding: "ieee-p1363" })
  return `vapid t=${header}.${claims}.${b64u(signature)}, k=${keys.publicKey}`
}

export type PushResult = { ok: boolean; gone: boolean; status: number }

/** Send one message to one device. `gone` means the device unsubscribed and should be forgotten. */
export async function sendPush(
  device: PushDevice,
  message: unknown,
  keys: { publicKey: string; privateKey: string; subject: string },
): Promise<PushResult> {
  if (!PUSH_ENDPOINT.test(device.endpoint)) return { ok: false, gone: true, status: 0 }
  const body = encryptPayload(Buffer.from(JSON.stringify(message)), device)
  const res = await fetch(device.endpoint, {
    method: "POST",
    headers: {
      Authorization: vapidAuthorization(device.endpoint, keys),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(24 * 3600),
      Urgency: "normal",
    },
    body: new Uint8Array(body),
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  })
  return { ok: res.ok, gone: res.status === 404 || res.status === 410, status: res.status }
}
