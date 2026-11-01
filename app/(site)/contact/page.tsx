import { ContactForm } from "@/components/site/contact-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/site/ui/card"

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      <Card>
        <CardHeader>
          <CardTitle>Contact us</CardTitle>
          <CardDescription>
            Have questions about Krpex or need support? Send us a message, or email{" "}
            <a href="mailto:info@krpex.in" className="text-primary hover:underline">
              info@krpex.in
            </a>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContactForm />
        </CardContent>
      </Card>
    </main>
  )
}
