import { Button } from "~/components/ui/button"
import OnboardingProgress from "./onboarding-progress"
import { PlanBasic } from "~/components/plans"
import { api } from "~/trpc/server"

export default async function PlanBasicCheckout() {
  await api.billing.createCustomerIfNull()
  const checkoutUrl = await api.billing.generateCheckoutLink({ plan: "Basic" })

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div>
        <h2 className="mb-6 text-4xl font-bold">Basic Plan Onboarding</h2>

        <OnboardingProgress />
        <p className="mb-20 mt-1 text-sm text-gray-500">
          You&apos;re almost done, click &quot;Checkout&quot; below.
        </p>
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
      </div>
    </div>
  )
}
