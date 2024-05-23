import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer"

import LeadDetailsForm from "./lead-details-form"
import { useMediaQuery } from "~/hooks/use-media-query"

export default function LeadFunnel({
  email,
  open,
  setOpen,
}: {
  email: string
  open: boolean
  setOpen: (open: boolean) => void
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const title = "You have been added to the waitlist!"
  const description = "If you'd like to jump the queue, tell us more."

  if (isDesktop) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-2xl">
            <DrawerHeader>
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription>{description}</DrawerDescription>
            </DrawerHeader>
            <DrawerFooter>
              <LeadDetailsForm email={email} setOpen={setOpen} />
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <LeadDetailsForm email={email} setOpen={setOpen} />
      </DialogContent>
    </Dialog>
  )
}
