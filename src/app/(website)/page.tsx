import { AboutFounder } from "./_components/sections/AboutFounder";
import { BookingForm } from "./_components/sections/BookingForm";
// import { CaseStudies } from './_components/sections/CaseStudies'
import { FAQ } from "./_components/sections/FAQ";
import { FinalCTA } from "./_components/sections/FinalCTA";
// import { Guarantee } from './_components/sections/Guarantee'
import { Hero } from "./_components/sections/Hero";
import { HowItWorks } from "./_components/sections/HowItWorks";
import { Pricing } from "./_components/sections/Pricing";
import Problem from "./_components/sections/Problem";
import { Results } from "./_components/sections/Results";
import Solution from "./_components/sections/Solution";

export default function HomePage() {
  return (
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
  );
}
