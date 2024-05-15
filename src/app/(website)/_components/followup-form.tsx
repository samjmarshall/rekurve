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
import { type FormEvent, useState } from "react"

import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Textarea } from "~/components/ui/textarea"
import { api } from "~/trpc/react"
import { executeRecaptcha } from "~/lib/recaptcha-client"
import { toast } from "sonner"
import { useMediaQuery } from "~/hooks/use-media-query"

export default function FollowUpForm({
  email,
  open,
  setOpen,
}: {
  email: string
  open: boolean
  setOpen: (open: boolean) => void
}) {
  const [recaptchaLoading, setRecaptchaLoading] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [problems, setProblems] = useState("")
  const [solutions, setSolutions] = useState("")

  const addDetails = api.waitlist.addDetails.useMutation({
    onSuccess: () => {
      setOpen(false)
      toast.success(`Your information has been submitted!`)
    },
    onError: () => {
      toast.error("Failed to send information. Please try again!")
    },
  })

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submit()
  }

  async function submit() {
    setRecaptchaLoading(true)
    const token = await executeRecaptcha("waitlist_add_details")
    setRecaptchaLoading(false)

    if (!token) {
      toast.error("Failed to send information. Please try again later!")
      return
    }

    addDetails.mutate({ name, company, email, token })
  }

  function DetailsForm() {
    return (
      <form onSubmit={handleFormSubmit} className="space-y-4 px-1">
        <div className="mt-2 grid grid-cols-2 gap-4 sm:mt-0">
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium">
              Name *
            </label>
            <Input
              id="name"
              className="text-base sm:text-sm"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="company" className="text-sm font-medium">
              Company *
            </label>
            <Input
              id="company"
              className="text-base sm:text-sm"
              autoComplete="organization"
              required
              value={company}
              onChange={(event) => setCompany(event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="problems" className="text-sm font-medium">
            What are your pain points right now?
          </label>
          <Textarea
            id="problems"
            className="resize-none text-base sm:text-sm"
            placeholder="Tell us your problems, we're listening!"
            value={problems}
            onChange={(event) => setProblems(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="solutions" className="text-sm font-medium">
            How have you tried to solve this is the past?
          </label>
          <Textarea
            id="solutions"
            className="resize-none text-base sm:text-sm"
            placeholder="Help us provide the best solution possible!"
            value={solutions}
            onChange={(event) => setSolutions(event.target.value)}
          />
        </div>
        <Button
          className="w-full"
          type="submit"
          disabled={addDetails.isPending || recaptchaLoading}
        >
          {addDetails.isPending || recaptchaLoading
            ? "Submitting..."
            : "Submit"}
        </Button>
        <Button
          className="w-full"
          type="button"
          variant="outline"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </form>
    )
  }

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
              <DetailsForm />
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
        <DetailsForm />
      </DialogContent>
    </Dialog>
  )
}
