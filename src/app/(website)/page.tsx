import About from "./_sections/about"
import Contact from "./_sections/contact"
import Features from "./_sections/features"
import Hero from "./_sections/hero"
import Pricing from "./_sections/pricing"
import Script from "next/script"
import Testimonials from "./_sections/testimonials"
import jsonLd from "./_components/json-ld"
import openGraph from "~/lib/open-graph"

export const metadata = {
  title: "Home | rekurve",
  description:
    "Construction management software with tools to manage every aspect of your construction projects, from estimation, scheduling, invoices and cashflow, to client collaboration and proposals.",
  openGraph: {
    ...openGraph,
    title: "Home | rekurve",
    description:
      "Construction management software with tools to manage every aspect of your construction projects, from estimation, scheduling, invoices and cashflow, to client collaboration and proposals.",
  },
}

export default function LandingPage() {
  return (
    <main className="flex-1">
      <Script
        id="json-ld-website-org"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            title: metadata.title,
            description: metadata.description,
          }),
        }}
      />
      <Hero />
      <Features />
      <About />
      <Testimonials />
      <Pricing />
      <Contact />
    </main>
  )
}
