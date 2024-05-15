import { type JSX, type SVGProps } from "react"

import Image from "next/image"
import Link from "next/link"
import WaitlistForm from "./_components/waitlist-form"
import { TRPCReactProvider } from "~/trpc/react"
import Hero from "./_components/hero"
import jsonLd from "~/lib/json-ld"
import { env } from "~/env"

export default function LandingPage() {
  return (
    <main className="flex-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            title: env.COMPANY_NAME,
            description: "Home",
          }),
        }}
      />

      <Hero />

      {/* Features - Option 1 */}
      {/* <section
          className="w-full bg-gray-100 py-12 dark:bg-gray-800 md:py-24 lg:py-32"
          id="features"
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">
                  Key Features
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Everything you need to manage construction projects.
                </h2>
                <p className="max-w-[900px] text-gray-500 dark:text-gray-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  From initial estimation to final handover, ConstructPro has
                  the tools to keep your projects on track and your clients
                  happy.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-2 lg:gap-12">
              <Image
                alt="Image"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last"
                height="310"
                src="/placeholder.svg"
                width="550"
              />
              <div className="flex flex-col justify-center space-y-4">
                <ul className="grid gap-6">
                  <li>
                    <div className="grid gap-1">
                      <h3 className="text-xl font-bold">Project Estimation</h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        Accurately estimate project costs and timelines with our
                        powerful estimation tools.
                      </p>
                    </div>
                  </li>
                  <li>
                    <div className="grid gap-1">
                      <h3 className="text-xl font-bold">Scheduling</h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        Create and manage detailed project schedules with
                        drag-and-drop ease.
                      </p>
                    </div>
                  </li>
                  <li>
                    <div className="grid gap-1">
                      <h3 className="text-xl font-bold">Financial Tracking</h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        Keep an eye on project budgets and expenses with
                        real-time financial tracking.
                      </p>
                    </div>
                  </li>
                  <li>
                    <div className="grid gap-1">
                      <h3 className="text-xl font-bold">Task Management</h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        Assign tasks, set deadlines, and track progress with our
                        intuitive task management tools.
                      </p>
                    </div>
                  </li>
                  <li>
                    <div className="grid gap-1">
                      <h3 className="text-xl font-bold">
                        Client Collaboration
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        Keep clients in the loop with real-time updates and
                        secure file sharing.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section> */}

      {/* Features - Option 2 */}
      <section className="w-full py-12 md:py-24 lg:py-32" id="features">
        <div className="container space-y-12 px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tighter sm:text-5xl">
                Key Features
              </h2>
              <p className="max-w-[900px] text-gray-500 dark:text-gray-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Tools to manage every aspect of your construction projects, from
                estimation and scheduling to client collaboration and proposals.
              </p>
            </div>
          </div>
          <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-2 md:gap-12 lg:max-w-5xl lg:grid-cols-3">
            <div className="grid gap-1">
              <CalendarIcon className="h-8 w-8 text-gray-900 dark:text-gray-50" />
              <h3 className="text-lg font-bold">Project Scheduling</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Easily create and manage project schedules, action items, and
                track progress in real-time.
              </p>
            </div>
            <div className="grid gap-1">
              <WalletIcon className="h-8 w-8 text-gray-900 dark:text-gray-50" />
              <h3 className="text-lg font-bold">Financial Tracking</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Stay on top of your project budgets, expenses and payment
                schedules with our comprehensive financial tracking tools.
              </p>
            </div>
            <div className="grid gap-1">
              <ClipboardIcon className="h-8 w-8 text-gray-900 dark:text-gray-50" />
              <h3 className="text-lg font-bold">Task Management</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Assign tasks, set deadlines, and collaborate with your team,
                suppliers and contractors to ensure projects are completed on
                time.
              </p>
            </div>
            <div className="grid gap-1">
              <PercentIcon className="h-8 w-8 text-gray-900 dark:text-gray-50" />
              <h3 className="text-lg font-bold">Project Estimation</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Accurately estimate project costs and materials with our
                advanced estimation tools.
              </p>
            </div>
            <div className="grid gap-1">
              <MergeIcon className="h-8 w-8 text-gray-900 dark:text-gray-50" />
              <h3 className="text-lg font-bold">Client Collaboration</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Seamlessly collaborate with clients, provide proposals, share
                updates, and get real-time feedback on your projects.
              </p>
            </div>
            <div className="grid gap-1">
              <ViewIcon className="h-8 w-8 text-gray-900 dark:text-gray-50" />
              <h3 className="text-lg font-bold">Comprehensive Reporting</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Generate detailed reports on project progress, financials and
                more. Keeping you informed.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md bg-gray-900 px-8 text-sm font-medium text-gray-50 shadow transition-colors hover:bg-gray-900/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 dark:focus-visible:ring-gray-300"
              href="#contact"
            >
              Contact Us
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-gray-200 bg-white px-8 text-sm font-medium shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-800 dark:hover:text-gray-50 dark:focus-visible:ring-gray-300"
              href="#about"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Logos/About - Option 1 */}
      <section className="w-full py-12 md:py-24 lg:py-32" id="about">
        <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6 lg:gap-10">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Trusted by leading construction firms.
            </h2>
            <p className="mx-auto max-w-[700px] text-gray-500 dark:text-gray-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              ConstructPro is used by construction companies of all sizes to
              streamline their projects and deliver exceptional results.
            </p>
          </div>
          <div className="grid w-full grid-cols-2 items-center justify-center gap-8 lg:grid-cols-5 lg:gap-12 [&>img]:mx-auto">
            <Image
              alt="Logo"
              className="aspect-[2/1] overflow-hidden rounded-lg object-contain object-center"
              height="70"
              src="/placeholder.svg"
              width="140"
            />
            <Image
              alt="Logo"
              className="aspect-[2/1] overflow-hidden rounded-lg object-contain object-center"
              height="70"
              src="/placeholder.svg"
              width="140"
            />
            <Image
              alt="Logo"
              className="aspect-[2/1] overflow-hidden rounded-lg object-contain object-center"
              height="70"
              src="/placeholder.svg"
              width="140"
            />
            <Image
              alt="Logo"
              className="aspect-[2/1] overflow-hidden rounded-lg object-contain object-center"
              height="70"
              src="/placeholder.svg"
              width="140"
            />
            <Image
              alt="Logo"
              className="aspect-[2/1] overflow-hidden rounded-lg object-contain object-center"
              height="70"
              src="/placeholder.svg"
              width="140"
            />
          </div>
        </div>
      </section>

      {/* Logos/About - Option 2 */}
      {/* <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800" id="about">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                Trusted by Leading Construction Companies
              </h2>
              <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                Construct Pro is the preferred construction project management solution for top companies in the
                industry.
              </p>
            </div>
            <div className="divide-y rounded-lg border">
              <div className="grid w-full grid-cols-3 items-stretch justify-center divide-x md:grid-cols-5">
                <div className="mx-auto flex w-full items-center justify-center p-4 sm:p-8">
                  <Image
                    alt="Logo"
                    className="aspect-[2/1] overflow-hidden rounded-lg object-contain object-center"
                    height="70"
                    src="/placeholder.svg"
                    width="140"
                  />
                </div>
                <div className="mx-auto flex w-full items-center justify-center p-4 sm:p-8">
                  <Image
                    alt="Logo"
                    className="aspect-[2/1] overflow-hidden rounded-lg object-contain object-center"
                    height="70"
                    src="/placeholder.svg"
                    width="140"
                  />
                </div>
                <div className="mx-auto flex w-full items-center justify-center p-4 sm:p-8">
                  <Image
                    alt="Logo"
                    className="aspect-[2/1] overflow-hidden rounded-lg object-contain object-center"
                    height="70"
                    src="/placeholder.svg"
                    width="140"
                  />
                </div>
                <div className="mx-auto flex w-full items-center justify-center p-4 sm:p-8">
                  <Image
                    alt="Logo"
                    className="aspect-[2/1] overflow-hidden rounded-lg object-contain object-center"
                    height="70"
                    src="/placeholder.svg"
                    width="140"
                  />
                </div>
                <div className="mx-auto flex w-full items-center justify-center p-4 sm:p-8">
                  <Image
                    alt="Logo"
                    className="aspect-[2/1] overflow-hidden rounded-lg object-contain object-center"
                    height="70"
                    src="/placeholder.svg"
                    width="140"
                  />
                </div>
              </div>
            </div>
          </div>
        </section> */}

      {/* Logos/About - Option 3 */}
      {/* <section className="w-full py-12 md:py-24 lg:py-32 border-t" id="about">
          <div className="container grid items-center justify-center gap-4 px-4 md:px-6">
            <div className="space-y-3 text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">About Construct Pro</h2>
              <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                Construct Pro was founded with the mission to help construction teams work more efficiently and
                profitably. Our platform is designed by industry experts to streamline every aspect of your construction
                projects, from planning to completion.
              </p>
            </div>
            <div className="mx-auto grid max-w-4xl items-center gap-6 py-12 lg:grid-cols-2 lg:gap-12">
              <Image
                alt="Image"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last"
                height="310"
                src="/placeholder.svg"
                width="550"
              />
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">Trusted by Leading Contractors</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Construct Pro is used by some of the largest construction companies in the industry, helping them
                    streamline their operations and improve profitability.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Image
                    alt="Logo"
                    className="aspect-[2/1] overflow-hidden rounded-lg object-contain object-center"
                    height="70"
                    src="/placeholder.svg"
                    width="140"
                  />
                  <Image
                    alt="Logo"
                    className="aspect-[2/1] overflow-hidden rounded-lg object-contain object-center"
                    height="70"
                    src="/placeholder.svg"
                    width="140"
                  />
                  <Image
                    alt="Logo"
                    className="aspect-[2/1] overflow-hidden rounded-lg object-contain object-center"
                    height="70"
                    src="/placeholder.svg"
                    width="140"
                  />
                  <Image
                    alt="Logo"
                    className="aspect-[2/1] overflow-hidden rounded-lg object-contain object-center"
                    height="70"
                    src="/placeholder.svg"
                    width="140"
                  />
                </div>
              </div>
            </div>
          </div>
        </section> */}

      {/* Testimonials - Option 1 */}
      <section
        className="w-full bg-gray-100 py-12 dark:bg-gray-800 md:py-24 lg:py-32"
        id="testimonials"
      >
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_550px]">
            <Image
              alt="Image"
              className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last"
              height="310"
              src="/placeholder.svg"
              width="550"
            />
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">
                  Testimonial
                </div>
                <blockquote className="text-lg font-semibold leading-snug lg:text-xl lg:leading-normal xl:text-2xl">
                  &quot;Using rekurve allowed us to double our business. We can
                  finally see exactly what&apos;s happening in our business, and
                  see what&apos;s coming in the weeks ahead. The planning tools
                  have reduced the time to accurately estimate and present a
                  proposal from weeks to days.&quot;
                </blockquote>
                <div>
                  <div className="font-semibold">Ben Makim</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Owner, Makim Bulders
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials - Option 2 */}
      {/* <section className="w-full py-12 md:py-24 lg:py-32" id="testimonials">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">
                  Customer Testimonials
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  What Our Customers Say
                </h2>
                <p className="max-w-[900px] text-gray-500 dark:text-gray-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Hear from the construction professionals who have streamlined
                  their workflows with Construct Pro.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-2 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <blockquote className="text-lg font-semibold leading-snug lg:text-xl lg:leading-normal xl:text-2xl">
                  “Construct Pro has been a game-changer for our construction
                  business. The project management tools have streamlined our
                  workflows and helped us deliver projects on time and under
                  budget.”
                </blockquote>
                <div>
                  <div className="font-semibold">John Doe</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Project Manager, ABC Construction
                  </div>
                </div>
              </div>
              <Image
                alt="Testimonial"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last"
                height="310"
                src="/placeholder.svg"
                width="550"
              />
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-2 lg:gap-12">
              <Image
                alt="Testimonial"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full"
                height="310"
                src="/placeholder.svg"
                width="550"
              />
              <div className="flex flex-col justify-center space-y-4">
                <blockquote className="text-lg font-semibold leading-snug lg:text-xl lg:leading-normal xl:text-2xl" />
              </div>
            </div>
          </div>
        </section> */}

      {/* Pricing - Option 1 */}
      {/* <section className="w-full py-12 md:py-24 lg:py-32" id="pricing">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Pricing</h2>
                <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  Choose the plan that fits your construction business. No hidden fees, cancel anytime.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Starter</CardTitle>
                  <CardDescription>
                    Perfect for small teams and individual contractors.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-4xl font-bold">$29</p>
                    <p className="text-gray-500 dark:text-gray-400">
                      per month
                    </p>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Project management
                    </li>
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Timesheets
                    </li>
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Basic reporting
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button>Get Started</Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Pro</CardTitle>
                  <CardDescription>
                    Ideal for growing teams and mid-sized projects.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-4xl font-bold">$49</p>
                    <p className="text-gray-500 dark:text-gray-400">
                      per month
                    </p>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Project management
                    </li>
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Timesheets
                    </li>
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Advanced reporting
                    </li>
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Financial tracking
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button>Get Started</Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Enterprise</CardTitle>
                  <CardDescription>
                    Tailored for large organizations and complex projects.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-4xl font-bold">$99</p>
                    <p className="text-gray-500 dark:text-gray-400">
                      per month
                    </p>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Project management
                    </li>
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Timesheets
                    </li>
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Advanced reporting
                    </li>
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Financial tracking
                    </li>
                    <li>
                      <CheckIcon className="mr-2 inline-block h-4 w-4 text-green-500" />
                      Custom integrations
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button>Get Started</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section> */}

      {/* Pricing - Option 2 */}
      {/* <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800" id="pricing">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Simple, transparent pricing.</h2>
                <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  Choose the plan that's right for your business. No hidden fees, no surprises.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <Card>
                <CardHeader>
                  <CardTitle>Basic</CardTitle>
                  <CardDescription>For small projects and teams</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4 text-green-500" />
                      <span>Task management</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4 text-green-500" />
                      <span>Resource allocation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4 text-green-500" />
                      <span>Basic reporting</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4 text-green-500" />
                      <span>Email support</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">$49</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">/month</span>
                  </div>
                  <Button className="w-full mt-4">Get Started</Button>
                </CardFooter>
              </Card>
              <Card className="bg-gray-900 text-gray-50 dark:bg-gray-50 dark:text-gray-900">
                <CardHeader>
                  <CardTitle>Pro</CardTitle>
                  <CardDescription>For medium-sized projects and teams</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4 text-green-500" />
                      <span>Task management</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4 text-green-500" />
                      <span>Resource allocation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4 text-green-500" />
                      <span>Advanced reporting</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4 text-green-500" />
                      <span>Client collaboration tools</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4 text-green-500" />
                      <span>Priority email support</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">$99</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">/month</span>
                  </div>
                  <Button className="w-full mt-4 bg-gray-50 text-gray-900 hover:bg-gray-50/90 dark:bg-gray-900 dark:text-gray-50 dark:hover:bg-gray-900/90">
                    Get Started
                  </Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Enterprise</CardTitle>
                  <CardDescription>For large projects and teams</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4 text-green-500" />
                      <span>Task management</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4 text-green-500" />
                      <span>Resource allocation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4 text-green-500" />
                      <span>Advanced reporting</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4 text-green-500" />
                      <span>Client collaboration tools</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4 text-green-500" />
                      <span>Dedicated support</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">$199</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">/month</span>
                  </div>
                  <Button className="w-full mt-4">Get Started</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section> */}

      <section id="contact" className="w-full border-t py-12 md:py-24 lg:py-32">
        <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
              Take Control of Your Construction Projects
            </h2>
            <p className="mx-auto max-w-[600px] text-gray-500 dark:text-gray-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Join the waitlist for early access rekurve before it&apos;s
              released to the general public. We can only take on a few select
              customers at this time.
            </p>
          </div>

          <TRPCReactProvider>
            <WaitlistForm />
          </TRPCReactProvider>
        </div>
      </section>
    </main>
  )
}

// function CheckIcon(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
//   return (
//     <svg
//       {...props}
//       xmlns="http://www.w3.org/2000/svg"
//       width="24"
//       height="24"
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="2"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//     >
//       <path d="M20 6 9 17l-5-5" />
//     </svg>
//   );
// }

function CalendarIcon(
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>,
) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  )
}

function ClipboardIcon(
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>,
) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  )
}

function MergeIcon(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m8 6 4-4 4 4" />
      <path d="M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22" />
      <path d="m20 22-5-5" />
    </svg>
  )
}

function PercentIcon(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" x2="5" y1="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  )
}

function ViewIcon(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12s2.545-5 7-5c4.454 0 7 5 7 5s-2.546 5-7 5c-4.455 0-7-5-7-5z" />
      <path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
      <path d="M21 17v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2" />
      <path d="M21 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2" />
    </svg>
  )
}

function WalletIcon(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  )
}
