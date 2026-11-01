import { ContactBlock, LegalPage, List, Section } from "@/components/site/legal-page"
import { LEGAL } from "@/lib/legal"

export const metadata = { title: "Refund & Cancellation Policy — Krpex" }

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      summary={
        <p>
          Pro is a 30-day pass with no auto-renewal, so there&apos;s nothing to cancel. Unused credit packs, and Pro passes
          you haven&apos;t used, can be refunded within 7 days of purchase. Failed or duplicate charges are always refunded. Approved refunds reach your original
          payment method within 5–7 working days.
        </p>
      }
    >
      <Section title="1. What we sell">
        <List>
          <li>
            <strong>Pro pass</strong>: 30 days of higher daily and monthly limits. It doesn&apos;t renew automatically;
            buying another pass adds 30 days.
          </li>
          <li>
            <strong>Credit packs</strong>: one-time purchases of credits, used after your free or plan allowance runs out.
            Credits don&apos;t expire while your account is active.
          </li>
        </List>
      </Section>

      <Section title="2. Delivery">
        <p>
          Everything we sell is digital and delivered to your {LEGAL.brand} account. Pro and credits are usually active
          within a few minutes of a successful payment. Nothing is shipped. If your purchase doesn&apos;t appear within 24
          hours, contact us with your payment ID.
        </p>
      </Section>

      <Section title="3. Pro passes">
        <List>
          <li>Pro doesn&apos;t renew automatically, so you never need to cancel it. It simply ends after 30 days.</li>
          <li>
            If you change your mind, contact us within 7 days of buying a Pro pass. We&apos;ll refund it if you haven&apos;t
            used more than the Free plan&apos;s allowance since buying it.
          </li>
          <li>We don&apos;t give partial refunds for the unused days of a pass that has been used.</li>
        </List>
      </Section>

      <Section title="4. Refunds for credit packs">
        <List>
          <li>A credit pack can be refunded within 7 days of purchase if none of its credits have been used.</li>
          <li>Once credits from a pack have been used, that pack can&apos;t be refunded.</li>
          <li>Credits granted for free (promotions, goodwill) can&apos;t be exchanged for money.</li>
        </List>
      </Section>

      <Section title="5. Always refunded">
        <List>
          <li>Payments charged twice for the same order.</li>
          <li>Payments that were deducted but where the purchase didn&apos;t reach your account and we can&apos;t fix it.</li>
          <li>Charges we made in error.</li>
        </List>
        <p>
          If an AI answer fails after using a credit, the credit is returned automatically (up to 2 times a day). For
          anything else that went wrong with a purchase, contact us and we&apos;ll make it right.
        </p>
      </Section>

      <Section title="6. How to ask for a refund">
        <p>
          Email us from the address on your account with your payment ID (from your receipt or Razorpay confirmation) and
          the reason. We reply within 2 working days. Approved refunds go back to the original payment method, usually
          within 5–7 working days depending on your bank.
        </p>
      </Section>

      <Section title="7. Account deletion">
        <p>
          Deleting your account ends any Pro pass and removes unused credits. If you want a refund for an eligible credit
          pack, ask for it before deleting your account.
        </p>
      </Section>

      <Section title="8. Contact">
        <ContactBlock />
      </Section>
    </LegalPage>
  )
}
