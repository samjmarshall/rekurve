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
import React, { useEffect, useState } from "react"

import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { ScrollArea } from "~/components/ui/scroll-area"
import { Textarea } from "~/components/ui/textarea"
import { api } from "~/trpc/react"
import { executeRecaptcha } from "~/lib/recaptcha-client"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
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
  const [recaptchaLoading, setRecaptchaLoading] = React.useState(false)
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== "undefined" ? window.visualViewport?.height : 0,
  )

  // Mobile devices have a visual viewport that changes when the keyboard is opened
  // This effect listens to the visual viewport resize event and updates the viewport height for the Drawer <ScrollArea />
  // See: https://github.com/shadcn-ui/ui/issues/2849, https://github.com/emilkowalski/vaul/issues/294
  useEffect(() => {
    function updateViewportHeight() {
      setViewportHeight(window.visualViewport?.height ?? 0)
    }

    window.visualViewport?.addEventListener("resize", updateViewportHeight)
    return () =>
      window.visualViewport?.removeEventListener("resize", updateViewportHeight)
  }, [])

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

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent>
        <ScrollArea
          className="mx-auto w-full max-w-2xl"
          style={{
            height: `${
              typeof window !== "undefined" &&
              viewportHeight &&
              window.innerHeight > viewportHeight
                ? `${viewportHeight - 40}px`
                : "100%"
            }`, // This wild shit resolves the input obstruction by mobile device keyboard slide outs. See: https://github.com/shadcn-ui/ui/issues/2849, https://github.com/emilkowalski/vaul/issues/294
          }}
        >
          <DrawerHeader>
            <DrawerTitle>
              Your email has been added to the waitlist!
            </DrawerTitle>
            <DrawerDescription className="text-base">
              If you&apos;d like to jump the queue, tell us more about you.
            </DrawerDescription>
          </DrawerHeader>

          <DrawerFooter>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base sm:text-sm">
                          Name *
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="text-base sm:text-sm"
                            autoComplete="name"
                            onPointerDown={(e) => e.stopPropagation()} // Disables scroll overlay when selecting input on mobile. See: https://github.com/shadcn-ui/ui/issues/2247
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
                        <FormLabel className="text-base sm:text-sm">
                          Company *
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="text-base sm:text-sm"
                            autoComplete="organization"
                            onPointerDown={(e) => e.stopPropagation()}
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
                      <FormLabel className="text-base sm:text-sm">
                        What are your pain points right now?
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className="resize-none text-base sm:text-sm"
                          placeholder="Tell us your problems, we're listening!"
                          onPointerDown={(e) => e.stopPropagation()}
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
                      <FormLabel className="text-base sm:text-sm">
                        How have you tried to solve this is the past?
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className="resize-none text-base sm:text-sm"
                          placeholder="Help us provide the best solution possible!"
                          onPointerDown={(e) => e.stopPropagation()}
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
              </form>
            </Form>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </DrawerFooter>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  )
}
