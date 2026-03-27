import { AboutFounder } from '~/components/sections/AboutFounder'
import { BookingForm } from '~/components/sections/BookingForm'
// import { CaseStudies } from '~/components/sections/CaseStudies'
import { FAQ } from '~/components/sections/FAQ'
import { FinalCTA } from '~/components/sections/FinalCTA'
// import { Guarantee } from '~/components/sections/Guarantee'
import { Hero } from '~/components/sections/Hero'
import { HowItWorks } from '~/components/sections/HowItWorks'
import { Pricing } from '~/components/sections/Pricing'
import Problem from '~/components/sections/Problem'
import { Results } from '~/components/sections/Results'
import Solution from '~/components/sections/Solution'

export default function HomePage() {
  return (
    <>
      <main className="min-h-screen">
        <Hero />
        <Problem />
        <Solution />
        <Results />
        {/* <CaseStudies /> */}
        <HowItWorks />
        <AboutFounder />
        <Pricing />
        {/* <Guarantee /> */}
        <BookingForm />
        <FAQ />
        <FinalCTA />
      </main>
    </>
  )
}
