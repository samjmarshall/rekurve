import { TRPCReactProvider } from "~/trpc/react"
import Waitlist from "../_components/waitlist"

export default function Contact() {
  return (
    <section id="contact" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
            Take Control of Your Construction Projects
          </h2>
          <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl/relaxed">
            Join the waitlist for early access. There is a limited number of
            spots available.
          </p>
        </div>

        <TRPCReactProvider>
          <Waitlist
          // nonce={nonce}
          />
        </TRPCReactProvider>
      </div>
    </section>
  )
}
