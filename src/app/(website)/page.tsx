import About from "./_sections/about"
import Contact from "./_sections/contact"
import Features from "./_sections/features"
import Hero from "./_sections/hero"
import Pricing from "./_sections/pricing"
import Script from "next/script"
import Testimonials from "./_sections/testimonials"
import { env } from "~/env"
import jsonLd from "~/lib/json-ld"
// import { headers } from "next/headers"
import { metadata as rootMetadata } from "./layout"

export const metadata = {
  title: "Home",
  description:
    "Construction management software with tools to manage every aspect of your construction projects, from estimation, scheduling, invoices and cashflow, to client collaboration and proposals.",
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
          __html: jsonLd(metadata),
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
