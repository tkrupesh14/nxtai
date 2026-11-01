import { ContactBlock, LegalPage, List, Section } from "@/components/site/legal-page"
import { LEGAL } from "@/lib/legal"

export const metadata = { title: "Refund & Cancellation Policy — NxtAI" }

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      summary={
        <p>
          Cancel Pro anytime; you keep it until the end of the period you paid for. Unused credit packs can be refunded
          within 7 days of purchase. Failed or duplicate charges are always refunded. Approved refunds reach your original
          payment method within 5–7 working days.
        </p>
      }
    >
      <Section title="1. What we sell">
        <List>
          <li>
            <strong>Pro plan</strong>: a monthly subscription with higher daily and monthly limits.
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

      <Section title="3. Cancelling Pro">
        <List>
          <li>You can cancel at any time from your Account page, or by emailing us.</li>
          <li>Cancelling stops the next renewal. You keep Pro until the end of the period you already paid for.</li>
          <li>We don&apos;t give partial refunds for unused days in a billing period, except as described below.</li>
          <li>
            If you were charged for a renewal you didn&apos;t want, contact us within 7 days of the charge and haven&apos;t
            used Pro features since: we&apos;ll refund that renewal.
          </li>
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
          Deleting your account ends any Pro plan and removes unused credits. If you want a refund for an eligible credit
          pack, ask for it before deleting your account.
        </p>
      </Section>

      <Section title="8. Contact">
        <ContactBlock />
      </Section>
    </LegalPage>
  )
}
