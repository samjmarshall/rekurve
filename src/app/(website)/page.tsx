import About from "./_sections/about"
import Contact from "./_sections/contact"
import Features from "./_sections/features"
import Hero from "./_sections/hero"
import Pricing from "./_sections/pricing"
import Script from "next/script"
import Testimonials from "./_sections/testimonials"
import jsonLd from "~/lib/json-ld"
// import { headers } from "next/headers"
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
  // const nonce = headers().get("x-nonce")

  // if (!nonce) {
  //   throw new Error("Missing nonce header")
  // }

  return (
    <main className="flex-1">
      <Script
        id="json-ld"
        type="application/ld+json"
        // nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            urlPath: "/",
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
