import { Button } from "~/components/ui/button"
import { PlanEnterprise } from "~/components/plans"

export default async function PlanEnterpriseCheckout() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <PlanEnterprise>
        <Button className="ml-4 w-full" disabled title="Checkout">
          Checkout
        </Button>
      </PlanEnterprise>
    </div>
  )
}
