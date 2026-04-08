import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { z } from "zod";
import { isValidAuMobile } from "~/lib/phone";
import { leadSourceSchema } from "~/server/api/schemas/leads";

export const quickCaptureFormSchema = z.object({
  firstName: z
    .string({ error: "First name is required" })
    .min(1, "First name is required")
    .max(100),
  lastName: z
    .string({ error: "Last name is required" })
    .min(1, "Last name is required")
    .max(100),
  phone: z
    .string({ error: "Phone number is required" })
    .min(1, "Phone number is required")
    .max(20)
    .refine(isValidAuMobile, {
      message: "Enter a valid AU mobile number (e.g. 0412 345 678)",
    }),
  notes: z.string().max(5000).optional(),
  leadSource: leadSourceSchema.default("other"),
});

// Form values use the schema's input type so that fields with `.default()`
// (leadSource) remain optional from the form's perspective.
export type QuickCaptureFormValues = z.input<typeof quickCaptureFormSchema>;

// React Hook Form sends "" for unfilled optional inputs — clean to undefined
// so the optional fields validate correctly.
export const quickCaptureFormResolver: Resolver<QuickCaptureFormValues> = (
  values,
  ctx,
  opts,
) => {
  const cleaned: Record<string, unknown> = { ...values };
  if (cleaned.notes === "") cleaned.notes = undefined;
  return zodResolver(quickCaptureFormSchema)(
    cleaned as QuickCaptureFormValues,
    ctx,
    opts,
  );
};
