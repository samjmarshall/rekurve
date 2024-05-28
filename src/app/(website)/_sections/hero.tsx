import Link from "next/link"
import { TRPCReactProvider } from "~/trpc/react"
import Waitlist from "../_components/waitlist"

export default function Hero() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-5 text-center">
          <h1
            aria-label="Construction Projects On Schedule & On Budget"
            className="text-3xl/none font-extrabold tracking-tighter sm:text-4xl/none md:text-5xl/none lg:text-6xl/none"
          >
            <span>Construction Projects</span>
            <span className="mt-2 flex flex-col items-center justify-center sm:mt-3 sm:flex-row">
              <span className="mx-1 bg-purple p-1 text-white shadow-md md:shadow-lg lg:mx-2">
                On Schedule
              </span>{" "}
              <span className="mt-3 sm:mt-0">
                &amp;{" "}
                <span className="bg-purple px-1 text-white shadow-md sm:mt-0 md:shadow-lg">
                  On Budget
                </span>
              </span>
            </span>
          </h1>
          <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl">
            Stay organized, track progress, monitor costs and payments, and
            collaborate with your customers.
          </p>
          <div className="flex flex-col gap-4">
            {/* <Link
              className="inline-flex h-10 items-center justify-center rounded-md bg-gray-900 px-8 text-sm font-medium text-gray-50 shadow transition-colors hover:bg-gray-900/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50"
              href="#contact"
              title="Join the Waitlist"
            >
              Join the Waitlist
            </Link> */}
            <TRPCReactProvider>
              <Waitlist
              // nonce={nonce}
              />
            </TRPCReactProvider>
            {/* <Link
                  className="inline-flex h-10 items-center justify-center rounded-md border border-gray-200 bg-white px-8 text-sm font-medium shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50"
                  href="#"
                  title="Watch Demo"
                >
                  Watch Demo
                </Link> */}
            <Link
              className="mx-auto inline-flex h-10 items-center justify-center rounded-md border border-gray-200 bg-white px-8 text-sm font-medium shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50"
              href="#features"
              title="Learn More"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
