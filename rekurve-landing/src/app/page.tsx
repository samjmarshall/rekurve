import Hero from '~/components/sections/Hero'
import Problem from '~/components/sections/Problem'
import Solution from '~/components/sections/Solution'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Problem />
      <Solution />
    </main>
  )
}
