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
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";
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
  message: z.string().optional(),
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
      message: "",
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    addDetails.mutate({ ...data, email });
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-2xl">
          <DrawerHeader>
            <DrawerTitle>
              Your email has been added to the waitlist!
            </DrawerTitle>
            <DrawerDescription>
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
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your name" {...field} />
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
                          <Input placeholder="Enter your company" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How can we help?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us your problems, so we can better build the solution."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button className="w-full" type="submit">
                  Submit
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
