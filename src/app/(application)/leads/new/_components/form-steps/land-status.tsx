"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import type { LeadCreate } from "~/server/api/schemas/leads";
import { SegmentedControl } from "../segmented-control";

const YES_NO_OPTIONS = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

interface LandStatusProps {
  form: UseFormReturn<LeadCreate>;
}

export function LandStatus({ form }: LandStatusProps) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;
  const hasLand = watch("hasLand");

  return (
    <FieldGroup>
      <Field>
        <FieldLabel>Do you have land?</FieldLabel>
        <Controller
          name="hasLand"
          control={control}
          render={({ field }) => (
            <SegmentedControl
              options={YES_NO_OPTIONS}
              value={field.value == null ? undefined : String(field.value)}
              onChange={(v) => field.onChange(v === "true")}
              aria-label="Has land"
            />
          )}
        />
      </Field>

      <AnimatePresence>
        {hasLand && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <FieldGroup>
              <Field>
                <FieldLabel>Is land registered?</FieldLabel>
                <Controller
                  name="landRegistered"
                  control={control}
                  render={({ field }) => (
                    <SegmentedControl
                      options={YES_NO_OPTIONS}
                      value={
                        field.value == null ? undefined : String(field.value)
                      }
                      onChange={(v) => field.onChange(v === "true")}
                      aria-label="Land registered"
                    />
                  )}
                />
              </Field>

              <Field data-invalid={!!errors.landAddress}>
                <FieldLabel htmlFor="landAddress">Property address</FieldLabel>
                <Input
                  {...register("landAddress")}
                  id="landAddress"
                  placeholder="123 Example St, Springfield"
                  aria-invalid={!!errors.landAddress}
                  aria-describedby={
                    errors.landAddress ? "landAddress-error" : undefined
                  }
                  data-testid="lead-form-land-address"
                />
                {errors.landAddress && (
                  <FieldError id="landAddress-error">
                    {errors.landAddress.message}
                  </FieldError>
                )}
              </Field>

              <FieldSet>
                <FieldLegend variant="label">Property dimensions</FieldLegend>
                <div className="grid grid-cols-3 gap-3">
                  <Field data-invalid={!!errors.landSizeSqm}>
                    <FieldLabel
                      htmlFor="landSizeSqm"
                      className="text-muted-foreground text-xs"
                    >
                      Area (m2)
                    </FieldLabel>
                    <Input
                      {...register("landSizeSqm")}
                      id="landSizeSqm"
                      inputMode="decimal"
                      placeholder="450"
                      aria-invalid={!!errors.landSizeSqm}
                      aria-describedby={
                        errors.landSizeSqm ? "landSizeSqm-error" : undefined
                      }
                      data-testid="lead-form-land-sqm"
                    />
                  </Field>
                  <Field data-invalid={!!errors.landWidth}>
                    <FieldLabel
                      htmlFor="landWidth"
                      className="text-muted-foreground text-xs"
                    >
                      Width (m)
                    </FieldLabel>
                    <Input
                      {...register("landWidth")}
                      id="landWidth"
                      inputMode="decimal"
                      placeholder="15"
                      aria-invalid={!!errors.landWidth}
                      aria-describedby={
                        errors.landWidth ? "landWidth-error" : undefined
                      }
                      data-testid="lead-form-land-width"
                    />
                  </Field>
                  <Field data-invalid={!!errors.landDepth}>
                    <FieldLabel
                      htmlFor="landDepth"
                      className="text-muted-foreground text-xs"
                    >
                      Depth (m)
                    </FieldLabel>
                    <Input
                      {...register("landDepth")}
                      id="landDepth"
                      inputMode="decimal"
                      placeholder="30"
                      aria-invalid={!!errors.landDepth}
                      aria-describedby={
                        errors.landDepth ? "landDepth-error" : undefined
                      }
                      data-testid="lead-form-land-depth"
                    />
                  </Field>
                </div>
              </FieldSet>
            </FieldGroup>
          </motion.div>
        )}
      </AnimatePresence>

      {hasLand === false && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="mt-4 text-muted-foreground text-sm"
        >
          No worries — we can help find the right land. Tap Next to continue.
        </motion.p>
      )}
    </FieldGroup>
  );
}
