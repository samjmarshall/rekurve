import Hero from '~/components/sections/Hero'
import Problem from '~/components/sections/Problem'
import Solution from '~/components/sections/Solution'
import { Results } from '~/components/sections/Results'
import { CaseStudies } from '~/components/sections/CaseStudies'
import { HowItWorks } from '~/components/sections/HowItWorks'
import { AboutFounder } from '~/components/sections/AboutFounder'
import { Pricing } from '~/components/sections/Pricing'
import { Guarantee } from '~/components/sections/Guarantee'
import { BookingForm } from '~/components/sections/BookingForm'
import { FAQ } from '~/components/sections/FAQ'
import { FinalCTA } from '~/components/sections/FinalCTA'
import { StickyBar } from '~/components/StickyBar'

export default function HomePage() {
  return (
    <>
      <StickyBar />
      <main className="min-h-screen">
        <Hero />
        <Problem />
        <Solution />
        <Results />
        <CaseStudies />
        <HowItWorks />
        <AboutFounder />
        <Pricing />
        <Guarantee />
        <BookingForm />
        <FAQ />
        <FinalCTA />
      </main>
    </>
  )
}
