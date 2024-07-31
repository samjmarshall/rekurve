import { Button } from "~/components/ui/button"
import { PlanPro } from "~/components/plans"

export default async function PlanProCheckout() {
  return (
    <PlanPro>
      <Button className="ml-4 w-full" disabled title="Checkout">
        Unavailable
      </Button>
    </PlanPro>
  )
}
