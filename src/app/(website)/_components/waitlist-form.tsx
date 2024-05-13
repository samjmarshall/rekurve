"use client";

import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "~/components/ui/drawer";
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
import Link from "next/link";
import React from "react";
import { Textarea } from "~/components/ui/textarea";
import { Toaster } from "~/components/ui/sonner";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export default function WaitlistForm() {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  // TODO: Add Recapcha to prevent spam

  const addEmail = api.waitlist.addEmail.useMutation({
    onSuccess: () => {
      setOpen(true)
    },
    onError: (error) => {
      toast.error("Failed to add email to waitlist. Please try again later!");
      console.log(error.message)
    }
  });

  const addDetails = api.waitlist.addDetails.useMutation({
    onSuccess: () => {
      setOpen(false)
      toast.success(`Your information has been submitted!`);
    },
    onError: () => {
      toast.error("Failed to send information. Please try again!");
    }
  });

  const WaitlistFormSchema = z.object({
    email: z.string().email({
      message: "Invalid email address.",
    }),
  });

  const waitlistForm = useForm<z.infer<typeof WaitlistFormSchema>>({
    resolver: zodResolver(WaitlistFormSchema),
    defaultValues: {
      email: "",
    },
  });

  function waitlistFormSubmit(data: z.infer<typeof WaitlistFormSchema>) {
    setEmail(data.email)
    addEmail.mutate(data);
  }

  const FollowUpFormSchema = z.object({
    name: z.string().min(2, {
      message: "Name must be at least 2 characters.",
    }).max(256, {
      message: "Name must be less than 256 characters.",
    }),
    company: z.string().min(2, {
      message: "Company name must be at least 2 characters.",
    }).max(256, {
      message: "Company name must be less than 256 characters.",
    }),
    message: z.string().optional(),
  });

  const followUpForm = useForm<z.infer<typeof FollowUpFormSchema>>({
    resolver: zodResolver(FollowUpFormSchema),
    defaultValues: {
      name: "",
      company: "",
      message: "",
    },
  });

  function followUpFormSubmit(data: z.infer<typeof FollowUpFormSchema>) {
    addDetails.mutate({ ...data, email });
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <Drawer open={open} onOpenChange={setOpen}>
        <Form {...waitlistForm}>
          <form className="space-y-2" onSubmit={waitlistForm.handleSubmit(waitlistFormSubmit)}>
            <FormField
              control={waitlistForm.control}
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
            <Button type="submit" disabled={addEmail.isPending}>{addEmail.isPending ? "Joining waitlist..." : "Join the Waitlist"}</Button>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              By signing up, you agree to our{" "}
              <Link className="underline underline-offset-2" href="#">
                Terms & Conditions
              </Link>
            </p>
          </form>
        </Form>

        <DrawerContent>
          <div className="mx-auto w-full max-w-2xl">
            <DrawerHeader>
              <DrawerTitle>Your email has been added to the waitlist!</DrawerTitle>
              <DrawerDescription>If you&apos;d like to jump the queue, tell us a little more about you.</DrawerDescription>
            </DrawerHeader>
            <DrawerFooter>
              <Form {...followUpForm}>
                <form onSubmit={followUpForm.handleSubmit(followUpFormSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={followUpForm.control}
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
                      control={followUpForm.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your company"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={followUpForm.control}
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
                  <Button className="w-full" type="submit">Submit</Button>
                </form>
              </Form>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      <Toaster />
    </div>
  );
}
