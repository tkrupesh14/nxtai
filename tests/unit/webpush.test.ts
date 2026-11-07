import { createDecipheriv, createECDH, createHmac, createPublicKey, verify } from "node:crypto"

import { describe, expect, it } from "vitest"

import { encryptPayload, PUSH_ENDPOINT, vapidAuthorization } from "@/lib/push/webpush"

// RFC 8291, Appendix A.
const RFC = {
  plaintext: "When I grow up, I want to be a watermelon",
  asPrivate: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  asPublic: "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  uaPrivate: "q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94",
  uaPublic: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  auth: "BTBZMqHH6r4Tts7J_aSIgg",
  salt: "DGv6ra1nlYgDCS1FRnbzlw",
  body:
    "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
}
const u = (s: string) => Buffer.from(s, "base64url")
const hmac = (k: Buffer, d: Buffer) => createHmac("sha256", k).update(d).digest()

/** What the browser does: decrypt with its private key. */
function decrypt(body: Buffer, uaPrivate: Buffer, authSecret: Buffer) {
  const salt = body.subarray(0, 16)
  const idlen = body[20]
  const asPublic = body.subarray(21, 21 + idlen)
  const ecdh = createECDH("prime256v1")
  ecdh.setPrivateKey(uaPrivate)
  const uaPublic = ecdh.getPublicKey()
  const prkKey = hmac(authSecret, ecdh.computeSecret(asPublic))
  const ikm = hmac(prkKey, Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic, Buffer.from([1])]))
  const prk = hmac(salt, ikm)
  const cek = hmac(prk, Buffer.from("Content-Encoding: aes128gcm\0\x01")).subarray(0, 16)
  const nonce = hmac(prk, Buffer.from("Content-Encoding: nonce\0\x01")).subarray(0, 12)
  const data = body.subarray(21 + idlen)
  const d = createDecipheriv("aes-128-gcm", cek, nonce)
  d.setAuthTag(data.subarray(data.length - 16))
  const out = Buffer.concat([d.update(data.subarray(0, data.length - 16)), d.final()])
  expect(out[out.length - 1]).toBe(2)
  return out.subarray(0, -1).toString()
}

describe("web push encryption", () => {
  it("matches the RFC 8291 example byte for byte", () => {
    const body = encryptPayload(Buffer.from(RFC.plaintext), { p256dh: RFC.uaPublic, auth: RFC.auth }, { asPrivate: u(RFC.asPrivate), salt: u(RFC.salt) })
    expect(body.toString("base64url")).toBe(RFC.body)
  })

  it("can be read by the device, and differs every time", () => {
    const device = { p256dh: RFC.uaPublic, auth: RFC.auth }
    const a = encryptPayload(Buffer.from('{"title":"Hi"}'), device)
    const b = encryptPayload(Buffer.from('{"title":"Hi"}'), device)
    expect(a.equals(b)).toBe(false)
    expect(decrypt(a, u(RFC.uaPrivate), u(RFC.auth))).toBe('{"title":"Hi"}')
  })

  it("rejects bad device keys", () => {
    expect(() => encryptPayload(Buffer.from("x"), { p256dh: "AAAA", auth: RFC.auth })).toThrow(/bad device keys/)
  })
})

describe("VAPID", () => {
  it("signs a token for the push service's origin that verifies with our public key", () => {
    const ecdh = createECDH("prime256v1")
    ecdh.generateKeys()
    const keys = { publicKey: ecdh.getPublicKey("base64url"), privateKey: ecdh.getPrivateKey("base64url"), subject: "mailto:info@krpex.in" }
    const header = vapidAuthorization("https://fcm.googleapis.com/fcm/send/abc", keys, Date.UTC(2026, 10, 7))
    const [, token, k] = header.match(/^vapid t=([^,]+), k=(.+)$/)!
    expect(k).toBe(keys.publicKey)
    const [h, c, s] = token.split(".")
    expect(JSON.parse(u(c).toString())).toEqual({ aud: "https://fcm.googleapis.com", exp: Date.UTC(2026, 10, 7) / 1000 + 43200, sub: "mailto:info@krpex.in" })
    const pub = u(keys.publicKey)
    const key = createPublicKey({ key: { kty: "EC", crv: "P-256", x: pub.subarray(1, 33).toString("base64url"), y: pub.subarray(33).toString("base64url") }, format: "jwk" })
    expect(verify("sha256", Buffer.from(`${h}.${c}`), { key, dsaEncoding: "ieee-p1363" }, u(s))).toBe(true)
  })

  it("only allows the big push services", () => {
    expect(PUSH_ENDPOINT.test("https://fcm.googleapis.com/fcm/send/x")).toBe(true)
    expect(PUSH_ENDPOINT.test("https://web.push.apple.com/QK")).toBe(true)
    expect(PUSH_ENDPOINT.test("https://fcm.googleapis.com.evil.io/x")).toBe(false)
    expect(PUSH_ENDPOINT.test("http://localhost:3000/")).toBe(false)
  })
})
