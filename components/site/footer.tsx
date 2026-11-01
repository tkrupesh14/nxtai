export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} NxtAI. All rights reserved.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <a href="/#platform" className="hover:text-foreground">
              Platform
            </a>
            <a href="/#features" className="hover:text-foreground">
              Features
            </a>
            <a href="/pricing" className="hover:text-foreground">
              Pricing
            </a>
            <a href="/contact" className="hover:text-foreground">
              Contact
            </a>
          </nav>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground md:justify-end">
          <a href="/terms" className="hover:text-foreground">
            Terms
          </a>
          <a href="/privacy" className="hover:text-foreground">
            Privacy
          </a>
          <a href="/refund-policy" className="hover:text-foreground">
            Refunds & cancellation
          </a>
          <a href="mailto:info@krpex.in" className="hover:text-foreground">
            info@krpex.in
          </a>
        </div>
      </div>
    </footer>
  )
}
