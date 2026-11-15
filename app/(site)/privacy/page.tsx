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
          content. If you join the closed beta, we also record how you use Krpex (and, once it&apos;s switched on, your
          sessions on screen, with what you type hidden) to find problems; that only happens with your agreement. We
          don&apos;t sell your data or show ads. You can delete your account and data at any time.
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
            and, if you sign in with GitHub, your public profile name and photo from GitHub.
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
            <strong>Coding practice (Krpex Code):</strong> the code you submit with its results, and the AI coach&apos;s
            answers. Your code runs in your own browser. It goes to our AI provider only when you ask the AI coach for
            help, and we keep the coach&apos;s answer and a fingerprint of the code (to spot repeat questions), not the
            code you sent.
          </li>
          <li>
            <strong>Public profile (optional):</strong> if you claim a handle, we store it with the display name and bio
            you choose. Your profile is private unless you make it public. A public profile at community.krpex.in/u/your-handle
            shows that name and bio, your level, XP, streak, how many coding problems you solved, your coding activity,
            the study plans you finished and, only if you choose, the problems you solved recently. It never shows your
            email or your code. You can make it private again at any time, and it is deleted with your account.
          </li>
          <li>
            <strong>Community posts:</strong> solutions, discussions, comments and upvotes you make on Krpex Community,
            and reports you send. Posts and comments are shown to other learners with your handle, display name and level
            (a problem&apos;s solutions only to people who solved it). Reports are seen only by our moderators. If you
            delete your account, your posts stay up as &ldquo;[deleted user]&rdquo; and your upvotes and reports are deleted.
          </li>
          <li>
            <strong>Notifications:</strong> short messages about your account (a professor&apos;s reply, a payment, a
            report we looked at), shown only to you and kept for 90 days. Ones you haven&apos;t seen in the app may also be
            emailed to you; you choose how often, or turn this off, in your settings or from any of these emails. If you
            turn on notifications on a phone or browser, we keep that device&apos;s push address and keys until you turn
            them off. Study reminders (at most one a day) are made from your lesson and question activity; you can turn
            them off.
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
            <strong>Feedback:</strong> what you send with the Feedback button: the kind (a bug, an idea, something
            confusing), what you write and any screenshot you add, plus, added automatically, the page you were on, your
            browser and device, screen and window size, language, the version of Krpex you were using and the last few
            errors on that page. Our team sees it, and our reply is shown to you. Screenshots are stored privately and
            seen only by you and our team. Don&apos;t put passwords or other people&apos;s details in a screenshot.
          </li>
          <li id="beta" className="scroll-mt-24">
            <strong>Beta testing (only if you join the closed beta):</strong>
            <ul className="mt-2 grid list-[circle] gap-2 pl-5">
              <li>
                <em>Your application:</em> your name, your WhatsApp number (to add you to the testers&apos; group and contact you about the beta), what describes you (student, working, teacher…), what you want to
                learn, the device you&apos;ll mostly use, how you heard of {LEGAL.brand} (including the name of the shared
                link you came through, if any, such as a community&apos;s name), when you agreed to beta tracking,
                our decision and our team&apos;s internal notes about it.
              </li>
              <li>
                <em>Activity:</em> the pages you visit on {LEGAL.site}, Krpex Code and Krpex Community, how long you stay,
                the page you came from, and the things you do that we already store for your account (lessons, quizzes,
                questions, coding submissions, posts). We use it to see which parts of {LEGAL.brand} work and where people
                get stuck.
              </li>
              <li>
                <em>Session recordings:</em>{" "}
                {LEGAL.sessionReplay ? (
                  <>
                    {LEGAL.sessionReplay} records
                  </>
                ) : (
                  <>once switched on (we&apos;ll name the service here first), a recording service records</>
                )}{" "}
                how pages look and respond as you use them: clicks, taps, scrolling and page changes. Everything you
                type, and the text on the page, is hidden in the recording. There are no recordings on your Account
                pages, payment pages or admin pages, and never of your camera, microphone or other apps. Recordings
                carry an anonymous tester code, not your name or email.
              </li>
            </ul>
            <p className="mt-2">
              Activity tracking and recordings happen only for approved testers who agreed to them on the application
              form, and only while the beta lasts.
            </p>
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
          <li>To email you notifications you haven&apos;t seen in the app, unless you turn this off.</li>
          <li>
            To run the closed beta: choose testers, read and answer feedback, and use beta activity and recordings to find
            bugs and confusing parts and decide what to improve. Never to advertise to you or to judge you as a person.
          </li>
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
            course outline, questions, the relevant parts of any material you uploaded, and the code you send to the AI
            coach are sent to generate content. Don&apos;t include sensitive personal information
            (such as health or financial details) in your goals or questions.
          </li>
          <li>
            <strong>Sarvam AI</strong> (India): speech-to-text for lecture recordings that professors upload.
          </li>
          <li>
            <strong>GitHub</strong>: only if you choose to sign in with it.
          </li>
          <li>
            <strong>Razorpay</strong>: payment processing, when you buy a plan or credits.
          </li>
          <li>
            <strong>Email provider (Spacemail)</strong>: to deliver account and notification emails.
          </li>
          <li>
            <strong>{LEGAL.sessionReplay || "A session-recording service"}</strong>: session recordings of beta testers
            who agreed to them{LEGAL.sessionReplay ? "" : " (not switched on yet; we'll name it here before it is)"}.
            {LEGAL.sessionReplay === "Microsoft Clarity" ? (
              <>
                {" "}
                Microsoft also uses this data as described in the{" "}
                <a href="https://www.microsoft.com/privacy/privacystatement" className="text-primary hover:underline" rel="noreferrer">
                  Microsoft Privacy Statement
                </a>
                .
              </>
            ) : null}
          </li>
          <li>
            <strong>Your browser&apos;s push service (Google, Apple, Mozilla or Microsoft)</strong>: delivers notifications
            to devices where you turned them on. Messages are encrypted so the service can&apos;t read them.
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
          preferences (such as theme and how far you got in a lesson). We don&apos;t use advertising cookies. The only
          third-party tracking is the session-recording service for beta testers who agreed to it, which may set its own
          cookies on {LEGAL.site}, Krpex Code and Krpex Community while you&apos;re signed in as a tester.
        </p>
      </Section>

      <Section title="6. How long we keep it">
        <p>
          We keep your data while your account is active. When you delete your account, your profile, courses, lessons,
          progress, professor chats and uploaded material are deleted immediately from our database (backups roll off within
          about 30 days). Uploaded material that never became a course is deleted after a day, and a course&apos;s material
          is deleted with the course. Feedback and screenshots are kept while your account exists and deleted with it.
          Beta activity (pages visited) is deleted after 90 days, and session recordings are deleted by the recording
          service after at most 90 days. Your beta application is kept while your account exists.
          We keep payment records as long as tax and accounting laws require.
        </p>
      </Section>

      <Section title="7. Your rights">
        <p>Under the DPDP Act and other applicable laws you can:</p>
        <List>
          <li>see and correct your information (most of it is on your Account page);</li>
          <li>delete your account and data (Account → Settings → Delete account);</li>
          <li>withdraw consent, by deleting your account or contacting us;</li>
          <li>
            leave the beta at any time by contacting us: activity tracking and recordings stop and we delete your beta
            activity (while the beta is closed, this also ends your beta access);
          </li>
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
