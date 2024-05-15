import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import React from "react";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";
import { executeRecaptcha } from "~/lib/recaptcha-client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

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
      message: "Company name must be at least 2 characters.",
    })
    .max(256, {
      message: "Company name must be less than 256 characters.",
    }),
  problems: z.string().optional(),
  solutions: z.string().optional(),
  budget: z.string().optional(),
});

export default function FollowUpForm({
  email,
  open,
  setOpen,
}: {
  email: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const [recaptchaLoading, setRecaptchaLoading] = React.useState(false);

  const addDetails = api.waitlist.addDetails.useMutation({
    onSuccess: () => {
      setOpen(false);
      toast.success(`Your information has been submitted!`);
    },
    onError: () => {
      toast.error("Failed to send information. Please try again!");
    },
  });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      company: "",
      problems: "",
      solutions: "",
      budget: "",
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setRecaptchaLoading(true);
    const token = await executeRecaptcha("waitlist_add_details");
    setRecaptchaLoading(false);

    if (!token) {
      toast.error("Failed to send information. Please try again later!");
      return;
    }

    addDetails.mutate({ ...data, email, token });
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-2xl">
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
                          <Input className="text-base sm:text-sm" {...field} />
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
                          <Input className="text-base sm:text-sm" {...field} />
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
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
