"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";

import { type JSX, type SVGProps } from "react";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import Link from "next/link";
import { Switch } from "~/components/ui/switch";
import { toast } from "~/components/ui/use-toast";

const materialFormSchema = z.object({
  name: z.string().min(2).max(80),
});

export function MaterialFormDrawer() {
  // 1. Define your form.
  const form = useForm<z.infer<typeof materialFormSchema>>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      name: "",
    },
  });

  // 2. Define a submit handler.
  function onSubmit(data: z.infer<typeof materialFormSchema>) {
    // Do something with the form values.
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    });
  }

  return (
    <Sheet>
      <SheetTrigger className="flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
        Material
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Material</SheetTitle>
          <SheetDescription>Add new materiel to estimate.</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="shadcn" {...field} />
                  </FormControl>
                  <FormDescription>Materiel display name.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <Label htmlFor="group">Group</Label>
              <Select>
                <SelectTrigger id="group">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent />
              </Select>
            </div>
            <div>
              <Label htmlFor="cost-code">Cost code*</Label>
              <Select>
                <SelectTrigger id="cost-code">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent />
              </Select>
            </div>
            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input id="quantity" placeholder="N/A" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="unit-type">Unit type*</Label>
                <Select>
                  <SelectTrigger id="unit-type">
                    <SelectValue placeholder="unit" />
                  </SelectTrigger>
                  <SelectContent />
                </Select>
              </div>
              <div className="flex-1">
                <Label htmlFor="status">Status</Label>
                <Select>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Incomplete" />
                  </SelectTrigger>
                  <SelectContent />
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="pricing">Pricing</Label>
              <Select>
                <SelectTrigger id="pricing">
                  <SelectValue placeholder="GST on expenses" />
                </SelectTrigger>
                <SelectContent />
              </Select>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="unit-cost">Unit cost ex. tax*</Label>
                <Input id="unit-cost" placeholder="$" />
              </div>
              <div className="flex-1">
                <Label htmlFor="unit-tax">Unit tax</Label>
                <Input id="unit-tax" placeholder="$0.00" />
              </div>
              <div className="flex-1">
                <Label htmlFor="unit-cost-inc-tax">Unit cost inc. tax</Label>
                <Input id="unit-cost-inc-tax" placeholder="$" />
              </div>
            </div>
            <div>
              <Label htmlFor="markup">Markup</Label>
              <Select>
                <SelectTrigger id="markup">
                  <SelectValue placeholder="%" />
                </SelectTrigger>
                <SelectContent />
              </Select>
            </div>
            <Link className="text-blue-600" href="#">
              Request for Quote
            </Link>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="" />
            </div>
            <div>
              <Label htmlFor="internal-note">Internal note</Label>
              <Textarea id="internal-note" placeholder="" />
            </div>
            <div>
              <Label htmlFor="attachments">Attachments</Label>
              <Button className="w-full" variant="outline">
                + Add Attachment
              </Button>
            </div>
            <div>
              <Label htmlFor="selection">Selection</Label>
              <Button className="w-full" variant="outline">
                Create Selection
              </Button>
            </div>
            <div className="flex items-center">
              <Switch id="visible-in-proposal" />
              <Label className="ml-2" htmlFor="visible-in-proposal">
                Visible in proposal
              </Label>
            </div>
            <div>
              <Label htmlFor="show-price">
                Show client price in proposal as
              </Label>
              <Select>
                <SelectTrigger id="show-price">
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent />
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md bg-blue-100 p-4">
              <BriefcaseIcon className="text-blue-600" />
              <div className="ml-2">
                <h3 className="font-semibold">Add Labour</h3>
                <p className="text-sm text-gray-600">
                  Item will automatically become an assembly
                </p>
              </div>
              <Button className="text-blue-600" variant="ghost">
                +
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Cost ex. tax $0.00</p>
                <p className="text-sm">Markup ex. tax $0.00</p>
                <p className="text-sm">Tax $0.00</p>
              </div>
              <div>
                <p className="text-lg font-semibold">Client price</p>
                <p className="text-lg font-semibold">$0.00</p>
              </div>
            </div>
            <Button type="submit">+ Add item</Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

function BriefcaseIcon(
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>,
) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
