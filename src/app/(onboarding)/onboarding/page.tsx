import { PlanBasic, PlanEnterprise, PlanPro } from "~/components/plans"

import Link from "next/link"
import { buttonVariants } from "~/components/ui/button"
import { cn } from "~/lib/utils"

export default async function OnboardingPage() {
  return (
    <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
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
        <Link
          className={cn(
            buttonVariants(),
            "ml-4 w-full bg-gray-50 text-gray-900 hover:bg-gray-50/90",
          )}
          title="Get Started"
          href="/onboarding/pro"
        >
          Get Started
        </Link>
      </PlanPro>
      <PlanEnterprise>
        <Link
          className={cn(buttonVariants(), "ml-4 w-full")}
          title="Get Started"
          href="/onboarding/enterprise"
        >
          Get Started
        </Link>
      </PlanEnterprise>
    </div>
  )
}
