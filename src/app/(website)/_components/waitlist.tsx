"use client"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form"

import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import LeadFunnel from "./lead-funnel"
import React from "react"
import TermsAndConditions from "./terms-and-conditions"
import { Toaster } from "~/components/ui/sonner"
import { api } from "~/trpc/react"
import { executeRecaptcha } from "~/lib/recaptcha-client"
import { sendGTMEvent } from "./gtm"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

const FormSchema = z.object({
  email: z.string().email({
    message: "Invalid email address.",
  }),
})

export function Waitlist() {
  const [open, setOpen] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [recaptchaLoading, setRecaptchaLoading] = React.useState(false)
  const eventName = "waitlist_addEmail"

  const addEmail = api.waitlist.addEmail.useMutation({
    onSuccess: () => {
      setOpen(true)
      sendGTMEvent({ event: eventName, success: true })
    },
    onError: () => {
      toast.error("Failed to add email to waitlist. Please try again later!")
      sendGTMEvent({ event: eventName, success: false })
    },
  })

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
    },
  })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setEmail(data.email)

    setRecaptchaLoading(true)
    const token = await executeRecaptcha(eventName)
    setRecaptchaLoading(false)

    if (!token) {
      toast.error("Failed to add email to waitlist. Please try again later!")
      toast.error(JSON.stringify(token))
      return
    }

    addEmail.mutate({ ...data, token })
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-sm sm:mt-0">
      <Form {...form}>
        <form
          aria-label="Join the waitlist"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="flex flex-col sm:flex-row">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      className="min-w-64 flex-1 rounded-b-none text-base focus-visible:border-slate-950 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-slate-950 focus-visible:ring-offset-0 sm:rounded-r-none sm:rounded-bl-sm sm:text-sm"
                      placeholder="Enter your email"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="rounded-t-none sm:rounded-l-none sm:rounded-tr-sm dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 dark:focus-visible:ring-gray-300"
              disabled={addEmail.isPending || recaptchaLoading}
            >
              {addEmail.isPending || recaptchaLoading
                ? "Joining waitlist..."
                : "Join the Waitlist"}
            </Button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            By joining, you agree to our <TermsAndConditions />
          </p>
        </form>
      </Form>
      <LeadFunnel email={email} open={open} setOpen={setOpen} />
      <Toaster />
    </div>
  )
}
