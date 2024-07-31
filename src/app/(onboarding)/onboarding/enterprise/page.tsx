import { Button } from "~/components/ui/button"
import { PlanEnterprise } from "~/components/plans"

export default async function PlanEnterpriseCheckout() {
  return (
    <PlanEnterprise>
      <Button className="ml-4 w-full" disabled title="Checkout">
        Unavailable
      </Button>
    </PlanEnterprise>
  )
}
