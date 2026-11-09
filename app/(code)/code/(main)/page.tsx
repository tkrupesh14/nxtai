import Link from "next/link"

import { Button } from "@/components/site/ui/button"
import { codeLinks } from "@/lib/code/host"

const NOW = [
  { title: "150 practice problems", body: "From first loops to dynamic programming, stacks and grids, with filters, tags, an acceptance rate for each and a problem of the day worth double XP." },
  { title: "A real workspace", body: "Problem and code side by side, panels you can resize, your own test cases with the expected answer, and what you printed for each test." },
  { title: "Clear results", body: "Accepted, wrong answer, runtime error or time limit — with the failing test shown in full, even a hidden one." },
  { title: "Hints, then the solution", body: "Hints in small steps that never cost XP. The official solution, with a short explanation of the idea, is there when you need it; the problem just stops giving XP." },
  { title: "Runs on your device", body: "Python 3.14 and modern JavaScript run in your own browser, so results come back instantly. Works on a phone too." },
  { title: "One streak with your courses", body: "Solves count as study days and earn XP towards the same levels and rewards as your Krpex courses." },
]
const NEXT = [
  { title: "AI coach", body: "Hints from your AI professor in small steps, \"explain this error\", and a code review once you've solved it." },
  { title: "Study plans and more problems", body: "Guided plans for school and placement prep, and the bank growing to 300 problems." },
  { title: "Community", body: "Profiles, discussions and shared solutions for each problem — opened once you've solved it, so nothing is spoiled." },
]

export default async function CodeHome() {
  const links = await codeLinks()
  return (
    <main>
      <section className="mx-auto max-w-5xl px-4 pb-12 pt-14 text-center md:pt-20">
        <p className="text-sm font-medium text-primary">Krpex Code</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight md:text-6xl">Practise coding right in your browser</h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
          Solve problems in Python or JavaScript with a proper workspace, see your tests pass instantly and earn XP for your Krpex streak.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href={links.code("/problems")}>Start solving</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={links.code("/playground")}>Open the playground</Link>
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Free · no install · Python loads once (about 12 MB), then it&apos;s quick</p>

        <div aria-hidden className="mx-auto mt-12 max-w-2xl overflow-hidden rounded-xl border bg-card text-left shadow-sm">
          <div className="flex items-center gap-1.5 border-b px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-muted-foreground/30" />
            <span className="size-2.5 rounded-full bg-muted-foreground/30" />
            <span className="size-2.5 rounded-full bg-muted-foreground/30" />
            <span className="ml-3 font-mono text-xs text-muted-foreground">main.py</span>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed">
            <span className="text-primary">def</span> greet(name):{"\n"}
            {"    "}
            <span className="text-primary">return</span> f&quot;Namaste, {"{name}"}!&quot;{"\n\n"}
            print(greet(&quot;Asha&quot;))
          </pre>
          <div className="border-t bg-muted/40 px-4 py-3 font-mono text-sm">
            <span className="text-muted-foreground">Output · </span>Namaste, Asha!
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-semibold tracking-tight">Ready now</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {NOW.map((f) => (
            <li key={f.title} className="rounded-xl border bg-card p-5">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-4">
        <h2 className="text-2xl font-semibold tracking-tight">Coming next</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {NEXT.map((f) => (
            <li key={f.title} className="rounded-xl border border-dashed p-5">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
