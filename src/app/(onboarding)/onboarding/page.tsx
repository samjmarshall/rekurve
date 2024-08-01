import { Button, buttonVariants } from "~/components/ui/button"
import { PlanBasic, PlanEnterprise, PlanPro } from "~/components/plans"

import Link from "next/link"
import { cn } from "~/lib/utils"

export default async function OnboardingPage() {
  return (
    <div className="mx-auto grid max-w-5xl items-center gap-6 py-6 lg:grid-cols-3 lg:gap-12">
      <PlanBasic>
        <Link
          className={cn(buttonVariants(), "ml-4 w-full")}
          title="Get Started"
          href="/onboarding/basic"
        >
          Get Started
        </Link>
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
  )
}
