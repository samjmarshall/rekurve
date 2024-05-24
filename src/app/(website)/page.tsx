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
import { metadata } from "./layout"

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
            title: env.COMPANY_NAME,
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
