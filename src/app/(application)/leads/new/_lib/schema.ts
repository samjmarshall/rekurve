import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { isValidAuMobile } from "~/lib/phone";
import { type LeadCreate, leadCreateSchema } from "~/server/api/schemas/leads";

export { isValidAuMobile };

export const leadFormSchema = leadCreateSchema.superRefine((data, ctx) => {
  if (data.phone) {
    if (!isValidAuMobile(data.phone)) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Enter a valid AU mobile number (e.g. 0412 345 678)",
      });
    }
  }
});

// React Hook Form sends "" for unfilled inputs, but nullish() only accepts
// null | undefined. This resolver cleans empty strings before validation.
export const leadFormResolver: Resolver<LeadCreate> = (values, ctx, opts) => {
  const cleaned = { ...values };
  for (const [key, value] of Object.entries(cleaned)) {
    if (value === "") {
      (cleaned as Record<string, unknown>)[key] = undefined;
    }
  }
  return zodResolver(leadFormSchema)(cleaned, ctx, opts);
};
