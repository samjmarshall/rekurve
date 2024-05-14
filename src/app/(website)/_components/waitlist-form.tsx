"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form";

import { Button } from "~/components/ui/button";
import FollowUpForm from "./followup-form";
import { Input } from "~/components/ui/input";
import Link from "next/link";
import React from "react";
import TermsAndConditions from "./terms-and-conditions";
import { Toaster } from "~/components/ui/sonner";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const FormSchema = z.object({
  email: z.string().email({
    message: "Invalid email address.",
  }),
});

export default function WaitlistForm() {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  // TODO: Add Recapcha to prevent spam

  const addEmail = api.waitlist.addEmail.useMutation({
    onSuccess: () => {
      setOpen(true);
    },
    onError: (error) => {
      toast.error("Failed to add email to waitlist. Please try again later!");
      console.log(error.message);
    },
  });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    setEmail(data.email);
    addEmail.mutate(data);
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <Form {...form}>
        <form className="space-y-2" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    className="max-w-lg flex-1"
                    placeholder="Enter your email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={addEmail.isPending}>
            {addEmail.isPending ? "Joining waitlist..." : "Join the Waitlist"}
          </Button>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            By signing up, you agree to our{" "}
            {/* <Link className="underline underline-offset-2" href="#">
              Terms & Conditions
            </Link> */}
            <TermsAndConditions />
          </p>
        </form>
      </Form>
      <FollowUpForm email={email} open={open} setOpen={setOpen} />
      <Toaster />
    </div>
  );
}
