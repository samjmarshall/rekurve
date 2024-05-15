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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form"

import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Textarea } from "~/components/ui/textarea"
import { api } from "~/trpc/react"
import { executeRecaptcha } from "~/lib/recaptcha-client"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { useMediaQuery } from "~/hooks/use-media-query"
import { useState } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

const FormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .max(256, {
      message: "Name must be less than 256 characters.",
    }),
  company: z
    .string()
    .min(2, {
      message: "Company must be at least 2 characters.",
    })
    .max(256, {
      message: "Company must be less than 256 characters.",
    }),
  problems: z.string().optional(),
  solutions: z.string().optional(),
})

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

  const addDetails = api.waitlist.addDetails.useMutation({
    onSuccess: () => {
      setOpen(false)
      toast.success(`Your information has been submitted!`)
    },
    onError: () => {
      toast.error("Failed to send information. Please try again!")
    },
  })

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      company: "",
      problems: "",
      solutions: "",
    },
  })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setRecaptchaLoading(true)
    const token = await executeRecaptcha("waitlist_add_details")
    setRecaptchaLoading(false)

    if (!token) {
      toast.error("Failed to send information. Please try again later!")
      return
    }

    addDetails.mutate({ ...data, email, token })
  }

  function DetailsForm() {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-1">
          <div className="mt-2 grid grid-cols-2 gap-4 sm:mt-0">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input
                      className="text-base sm:text-sm"
                      autoComplete="name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company *</FormLabel>
                  <FormControl>
                    <Input
                      className="text-base sm:text-sm"
                      autoComplete="organization"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="problems"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What are your pain points right now?</FormLabel>
                <FormControl>
                  <Textarea
                    className="resize-none text-base sm:text-sm"
                    placeholder="Tell us your problems, we're listening!"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="solutions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  How have you tried to solve this is the past?
                </FormLabel>
                <FormControl>
                  <Textarea
                    className="resize-none text-base sm:text-sm"
                    placeholder="Help us provide the best solution possible!"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
      </Form>
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
