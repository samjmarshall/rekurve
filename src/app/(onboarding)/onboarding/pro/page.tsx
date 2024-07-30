import { Button } from "~/components/ui/button"
import { PlanPro } from "~/components/plans"

export default async function PlanProCheckout() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <PlanPro>
        <Button className="ml-4 w-full" disabled title="Checkout">
          Checkout
        </Button>
      </PlanPro>
    </div>
  )
}
