import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CertificateActions } from "@/components/site/certificate-actions"
import { getPublicCertificate, issuedOn, studyHours } from "@/lib/learning/certificate"

const ORIGIN = "https://krpex.in"

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params
  const cert = await getPublicCertificate(code)
  if (!cert) return { title: "Certificate not found — Krpex", robots: { index: false } }
  const title = `${cert.full_name} completed ${cert.course_title} — Krpex certificate`
  return {
    title,
    description: `Certificate of completion for ${cert.course_title} (${cert.course_level}), issued ${issuedOn(cert.issued_at)}. Verification code ${cert.code}.`,
    robots: { index: false, follow: false },
    openGraph: { title, type: "website", url: `${ORIGIN}/certificate/${cert.code}` },
  }
}

export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const cert = await getPublicCertificate(code)
  if (!cert) notFound()

  const url = `${ORIGIN}/certificate/${cert.code}`
  const issued = new Date(cert.issued_at)
  const linkedIn = `https://www.linkedin.com/profile/add?${new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: cert.course_title,
    organizationName: "Krpex",
    issueYear: String(issued.getFullYear()),
    issueMonth: String(issued.getMonth() + 1),
    certUrl: url,
    certId: cert.code,
  })}`

  return (
    <main id="certificate-main" className="mx-auto max-w-4xl px-4 py-10 md:py-16 print:p-0">
      <style>{`
        @page { size: A4 landscape; margin: 0; }
        @media print {
          body > *:not(#certificate-main) { display: none !important; }
          html, body { background: #fff !important; }
          #certificate { box-shadow: none !important; height: 100vh; border-radius: 0 !important; }
        }
      `}</style>

      <article
        id="certificate"
        aria-label="Certificate of completion"
        className="relative overflow-hidden rounded-2xl border bg-white p-3 text-neutral-900 shadow-xl sm:p-5"
      >
        <div className="flex h-full flex-col items-center rounded-xl border-2 border-[#b08d57] px-5 py-10 text-center sm:px-12 sm:py-14">
          <p className="text-sm font-semibold tracking-[0.3em] text-[#8a6a35] uppercase">Krpex</p>
          <h1 className="mt-6 font-serif text-3xl tracking-tight sm:text-5xl">Certificate of Completion</h1>
          <p className="mt-8 text-sm text-neutral-500">This certifies that</p>
          <p className="mt-2 border-b border-neutral-300 px-6 pb-2 font-serif text-3xl break-words sm:text-4xl">{cert.full_name}</p>
          <p className="mt-6 text-sm text-neutral-500">has completed the course</p>
          <p className="mt-2 max-w-2xl text-xl font-semibold text-balance sm:text-2xl">{cert.course_title}</p>
          <p className="mt-3 text-sm text-neutral-600 capitalize">
            {cert.course_level} · {cert.lesson_count} lessons · about {studyHours(cert.total_minutes)} of study
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            Passed every module test and the final exam with a score of <strong>{cert.score}%</strong>
          </p>

          <div className="mt-10 grid w-full max-w-2xl grid-cols-1 gap-6 text-sm sm:grid-cols-2">
            <div>
              <p className="font-medium">{issuedOn(cert.issued_at)}</p>
              <p className="mt-1 border-t border-neutral-300 pt-1 text-xs text-neutral-500">Date issued</p>
            </div>
            <div>
              <p className="font-mono font-medium tracking-wider">{cert.code}</p>
              <p className="mt-1 border-t border-neutral-300 pt-1 text-xs text-neutral-500">Verification code</p>
            </div>
          </div>

          <p className="mt-10 max-w-xl text-xs text-neutral-500 text-pretty">
            Taught by an AI professor on Krpex. This certificate confirms completion of a Krpex course and its assessments; it is not
            an accredited qualification. Check it at krpex.in/certificate/{cert.code}
          </p>
        </div>
      </article>

      <div className="mt-8">
        <CertificateActions url={url} linkedIn={linkedIn} />
      </div>
    </main>
  )
}
