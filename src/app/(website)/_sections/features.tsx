import { type SVGProps } from "react"

export default function Features() {
  return (
    <>
      {/* Features - Option 1 */}
      {/* <section
          className="w-full bg-gray-100 py-12 md:py-24 lg:py-32"
          id="features"
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm">
                  Key Features
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Everything you need to manage construction projects.
                </h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed">
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
                src="/assets/placeholder.svg"
                width="550"
              />
              <div className="flex flex-col justify-center space-y-4">
                <ul className="grid gap-6">
                  <li>
                    <div className="grid gap-1">
                      <h3 className="text-xl font-bold">Project Estimation</h3>
                      <p className="text-gray-500">
                        Accurately estimate project costs and timelines with our
                        powerful estimation tools.
                      </p>
                    </div>
                  </li>
                  <li>
                    <div className="grid gap-1">
                      <h3 className="text-xl font-bold">Scheduling</h3>
                      <p className="text-gray-500">
                        Create and manage detailed project schedules with
                        drag-and-drop ease.
                      </p>
                    </div>
                  </li>
                  <li>
                    <div className="grid gap-1">
                      <h3 className="text-xl font-bold">Financial Tracking</h3>
                      <p className="text-gray-500">
                        Keep an eye on project budgets and expenses with
                        real-time financial tracking.
                      </p>
                    </div>
                  </li>
                  <li>
                    <div className="grid gap-1">
                      <h3 className="text-xl font-bold">Task Management</h3>
                      <p className="text-gray-500">
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
                      <p className="text-gray-500">
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
              <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed">
                Tools to manage every aspect of your construction projects, from
                estimation and scheduling to client collaboration and proposals.
              </p>
            </div>
          </div>
          <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-2 md:gap-12 lg:max-w-5xl lg:grid-cols-3">
            <div className="grid gap-1">
              <CalendarIcon className="h-8 w-8 text-gray-900" />
              <h3 className="text-lg font-bold">Smart Scheduling</h3>
              <p className="text-sm text-gray-500">
                AI assisted project schedules and action items to track progress
                in real-time, helping prevent problems before they hit.
              </p>
            </div>
            <div className="grid gap-1">
              <WalletIcon className="h-8 w-8 text-gray-900" />
              <h3 className="text-lg font-bold">Financial Tracking</h3>
              <p className="text-sm text-gray-500">
                Project budget and cost tracking. Xero and Reckon integration to
                sync past and future project expenses/invoices, forecasting your
                cashflow.
              </p>
            </div>
            <div className="grid gap-1">
              <ClipboardIcon className="h-8 w-8 text-gray-900" />
              <h3 className="text-lg font-bold">Task Management</h3>
              <p className="text-sm text-gray-500">
                Assign tasks, set deadlines, and collaborate with your team,
                suppliers and contractors to ensure projects are completed on
                time.
              </p>
            </div>
            <div className="grid gap-1">
              <PercentIcon className="h-8 w-8 text-gray-900" />
              <h3 className="text-lg font-bold">Project Estimation</h3>
              <p className="text-sm text-gray-500">
                Accurately estimate project costs and materials with our
                advanced estimation tools.
              </p>
            </div>
            <div className="grid gap-1">
              <MergeIcon className="h-8 w-8 text-gray-900" />
              <h3 className="text-lg font-bold">Client Collaboration</h3>
              <p className="text-sm text-gray-500">
                Seamlessly collaborate with clients, provide proposals, share
                updates, and get real-time feedback on your projects.
              </p>
            </div>
            <div className="grid gap-1">
              <ViewIcon className="h-8 w-8 text-gray-900" />
              <h3 className="text-lg font-bold">Comprehensive Reporting</h3>
              <p className="text-sm text-gray-500">
                Generate detailed reports on project progress, financials and
                more. Keeping you informed.
              </p>
            </div>
          </div>
          {/* <div className="flex flex-col items-center justify-center gap-4 sm:flex-row md:hidden">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md bg-gray-900 px-8 text-sm font-medium text-gray-50 shadow transition-colors hover:bg-gray-900/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50"
              href="#contact"
              title="Contact Us"
            >
              Contact Us
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-gray-200 bg-white px-8 text-sm font-medium shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50"
              href="#about"
              title="Learn More"
            >
              Learn More
            </Link>
          </div> */}
        </div>
      </section>
    </>
  )
}

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
