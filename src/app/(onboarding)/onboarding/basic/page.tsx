import { Button } from "~/components/ui/button"
import Link from "next/link"
import OnboardingProgress from "./onboarding-progress"
import { PlanBasic } from "~/components/plans"
import { Switch } from "~/components/ui/switch"
import { api } from "~/trpc/server"

export default async function PlanBasicCheckout() {
  await api.billing.createCustomerIfNull()

  const checkoutUrl = await api.billing.generateCheckoutLink({
    plan: "Basic",
  })

  return (
    <div className="p-6">
      <h2 className="mb-6 text-2xl font-bold sm:text-4xl">
        Basic Plan Onboarding
      </h2>

      <OnboardingProgress />
      <p className="mt-1 text-sm text-gray-500">
        You&apos;re almost done, click &quot;Checkout&quot; below.
      </p>
      <div className="mx-auto mt-14 grid w-3/5 grid-cols-3">
        <span className="ml-auto font-semibold text-slate-800">Monthly</span>
        <Switch className="mx-auto" checked={false} disabled />
        <span className="mr-auto text-slate-800">Yearly</span>
      </div>
      <div className="mb-14 mt-2 text-center text-sm text-gray-500">
        Save 15% by switching to yearly billing.
      </div>
      <div className="flex items-center justify-center">
        <PlanBasic>
          <Button
            className="ml-4 w-full"
            disabled={!checkoutUrl}
            title="Checkout"
            asChild
          >
            <a href={checkoutUrl ?? undefined} rel="noopener noreferrer">
              Checkout
            </a>
          </Button>
        </PlanBasic>
      </div>
      <div className="mt-8 text-center">
        <Link className="text-gray-500 underline" href="/onboarding">
          See other plans
        </Link>
      </div>
    </div>
  )
}
