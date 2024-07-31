import { PlanBasic, PlanEnterprise, PlanPro } from "~/components/plans"

import { Button } from "~/components/ui/button"
import GetStartedButton from "../_components/get-started-button"

export default function Pricing() {
  return (
    <section
      className="w-full bg-gray-100 py-12 md:py-24 lg:py-32"
      id="pricing"
    >
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
              Simple, transparent pricing.
            </h2>
            <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl/relaxed">
              Choose the plan that&apos;s right for your business. No hidden
              fees, no surprises.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
          <PlanBasic>
            <GetStartedButton href="/signup?plan=Basic" />
          </PlanBasic>
          <PlanPro>
            <Button
              className="ml-4 w-full bg-gray-50 font-bold text-red-600 line-through hover:bg-gray-50/90"
              disabled
            >
              Sold Out
            </Button>
          </PlanPro>
          <PlanEnterprise>
            <Button
              className="ml-4 w-full font-bold text-red-400 line-through"
              disabled
            >
              Sold Out
            </Button>
          </PlanEnterprise>
        </div>
      </div>
    </section>
  )
}

// function Check(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
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
//   )
// }
