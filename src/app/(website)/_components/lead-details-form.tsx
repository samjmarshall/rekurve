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
import { sendGTMEvent } from "~/lib/gtm-client"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
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

export default function LeadDetailsForm({
  email,
  setOpen,
}: {
  email: string
  setOpen: (open: boolean) => void
}) {
  const [recaptchaLoading, setRecaptchaLoading] = useState(false)
  const eventName = "waitlist_add_details"

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      company: "",
      problems: "",
      solutions: "",
    },
  })

  const addDetails = api.waitlist.addDetails.useMutation({
    onSuccess: () => {
      setOpen(false)
      toast.success(`Your information has been submitted!`)
      sendGTMEvent({ event: eventName, result: "success" })
    },
    onError: () => {
      // TODO: Add error type to GTM Event for error analytics
      toast.error("Failed to send information. Please try again!")
      sendGTMEvent({ event: eventName, result: "error" })
    },
  })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setRecaptchaLoading(true)
    const token = await executeRecaptcha(eventName)
    setRecaptchaLoading(false)

    if (!token) {
      toast.error("Failed to send information. Please try again later!")
      return
    }

    addDetails.mutate({ ...data, email, token })
  }

  return (
    <Form {...form}>
      <form
        id={eventName}
        aria-label="Add your details"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 px-1"
      >
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
          title="Submit"
        >
          {addDetails.isPending || recaptchaLoading
            ? "Submitting..."
            : "Submit"}
        </Button>
      </form>
    </Form>
  )
}
