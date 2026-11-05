import Link from "next/link"

import { ContactBlock, LegalPage, List, Section } from "@/components/site/legal-page"
import { LEGAL, operatorName } from "@/lib/legal"

export const metadata = { title: "Privacy Policy — Krpex" }

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary={
        <p>
          We collect what we need to run your account and build your courses: your name, email, learning answers, lessons,
          quiz progress and questions to your professors. Your learning inputs are sent to our AI provider to generate
          content. We don&apos;t sell your data or show ads. You can delete your account and data at any time.
        </p>
      }
    >
      <Section title="1. Who is responsible">
        <p>
          {operatorName()} runs {LEGAL.brand} ({LEGAL.site}) and is responsible for your personal data (the &quot;Data
          Fiduciary&quot; under India&apos;s Digital Personal Data Protection Act, 2023). Contact details are at the end of
          this page.
        </p>
      </Section>

      <Section title="2. What we collect">
        <List>
          <li>
            <strong>Account:</strong> name, email address, password (stored only as a secure hash by our sign-in provider),
            and, if you sign in with GitHub or Google, your public profile name and photo from that service.
          </li>
          <li>
            <strong>Learning profile:</strong> your goals, chosen subjects, level, background, learning style, available
            hours and timeline.
          </li>
          <li>
            <strong>Learning activity:</strong> the courses and lessons generated for you, quiz answers and scores, lesson
            progress, and the questions you ask your AI professors with their answers. In a course taught by a real
            professor&apos;s AI version, if you choose to send an answer to that professor to check, they see the lesson
            title, your question, the AI&apos;s answer and your note, never your name or email, and we keep their reply.
          </li>
          <li>
            <strong>Your material:</strong> if you build a course from your own files or pasted text, the text extracted
            from them, split into sections, plus the file name and page count. We don&apos;t keep the file itself.
          </li>
          <li>
            <strong>Professors who teach with us:</strong> if you join by invitation as a professor, your profile (name,
            title, institution, bio, languages), the qualifications you tell us about (seen only by Krpex), the version and
            date of the agreement you accepted, the text of material you upload (never the file), and the model lessons and
            lesson reviews you write (reviews are seen only by Krpex), the questions you add to your question bank, your
            replies to learners, and transcripts of lecture recordings you upload or record here (recordings are sent to
            Sarvam AI for transcription and not kept by us). Removing material deletes it from our database.
          </li>
          <li>
            <strong>Usage and billing:</strong> daily usage counts, plan, credit balance and payment records (order and
            payment IDs, amount, status). Card, UPI and bank details are handled by our payment partner, not stored by us.
          </li>
          <li>
            <strong>Messages:</strong> what you send through the contact form.
          </li>
          <li>
            <strong>Technical:</strong> IP address, browser and device information, and server logs used for security and
            fixing problems.
          </li>
        </List>
      </Section>

      <Section title="3. How we use it">
        <List>
          <li>To create and run your account and sign you in.</li>
          <li>To generate personal courses, lessons, quizzes and professor answers.</li>
          <li>To track progress, enforce plan limits and process payments.</li>
          <li>To keep the service secure, prevent abuse and fix problems.</li>
          <li>To reply to your messages and send essential account emails (confirmation, password reset, receipts).</li>
        </List>
        <p>
          We process your data to provide the service you asked for, based on your consent when you sign up, and to meet
          legal obligations. We don&apos;t sell your data, and we don&apos;t use it for advertising.
        </p>
      </Section>

      <Section title="4. Who we share it with">
        <p>We use trusted service providers who process data for us under their own security and privacy terms:</p>
        <List>
          <li>
            <strong>Supabase</strong>: database and sign-in.
          </li>
          <li>
            <strong>Amazon Web Services</strong>: hosting (servers in Sydney, Australia).
          </li>
          <li>
            <strong>OpenRouter and the AI model providers it routes to (such as OpenAI)</strong>: your learning profile,
            course outline, questions and the relevant parts of any material you uploaded are sent to generate content. Don&apos;t include sensitive personal information
            (such as health or financial details) in your goals or questions.
          </li>
          <li>
            <strong>Sarvam AI</strong> (India): speech-to-text for lecture recordings that professors upload.
          </li>
          <li>
            <strong>GitHub / Google</strong>: only if you choose to sign in with them.
          </li>
          <li>
            <strong>Razorpay</strong>: payment processing, when you buy a plan or credits.
          </li>
          <li>
            <strong>Email provider</strong>: to deliver account emails.
          </li>
        </List>
        <p>
          Some of these providers store or process data outside India. We may also disclose data if the law requires it, or
          to protect the rights and safety of our users or the service.
        </p>
      </Section>

      <Section title="5. Cookies and local storage">
        <p>
          We use essential cookies to keep you signed in, and your browser&apos;s local storage to remember small
          preferences (such as theme and how far you got in a lesson). We don&apos;t use advertising or third-party tracking
          cookies.
        </p>
      </Section>

      <Section title="6. How long we keep it">
        <p>
          We keep your data while your account is active. When you delete your account, your profile, courses, lessons,
          progress, professor chats and uploaded material are deleted immediately from our database (backups roll off within
          about 30 days). Uploaded material that never became a course is deleted after a day, and a course&apos;s material
          is deleted with the course.
          We keep payment records as long as tax and accounting laws require.
        </p>
      </Section>

      <Section title="7. Your rights">
        <p>Under the DPDP Act and other applicable laws you can:</p>
        <List>
          <li>see and correct your information (most of it is on your Account page);</li>
          <li>delete your account and data (Account → Settings → Delete account);</li>
          <li>withdraw consent, by deleting your account or contacting us;</li>
          <li>nominate someone to exercise these rights for you in case of death or incapacity;</li>
          <li>raise a complaint with our Grievance Officer, and then with the Data Protection Board of India.</li>
        </List>
      </Section>

      <Section title="8. Security">
        <p>
          We use HTTPS, access controls so each learner can only reach their own data, hashed passwords and limited access
          for our team. No system is perfectly secure; if a breach affects you, we&apos;ll tell you and the authorities as
          the law requires.
        </p>
      </Section>

      <Section title="9. Children">
        <p>
          The service is meant for people aged 18 and over. Anyone younger may use it only with a parent or guardian&apos;s
          verifiable consent. If you believe a child is using {LEGAL.brand} without consent, contact us and we&apos;ll
          delete the account.
        </p>
      </Section>

      <Section title="10. Changes">
        <p>
          We&apos;ll update this page when our practices change and change the date at the top. For important changes
          we&apos;ll also tell you in the app or by email.
        </p>
      </Section>

      <Section title="11. Contact and Grievance Officer">
        <p>
          For privacy questions, requests or complaints, contact our Grievance Officer
          {LEGAL.grievanceOfficer ? `, ${LEGAL.grievanceOfficer},` : ""} at the email below. We acknowledge requests within
          48 hours and resolve them within 15 days. See also our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>
          .
        </p>
        <ContactBlock />
      </Section>
    </LegalPage>
  )
}
