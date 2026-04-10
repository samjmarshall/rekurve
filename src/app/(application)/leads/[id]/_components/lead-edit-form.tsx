"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { AdditionalInfo } from "~/app/(application)/leads/new/_components/form-steps/additional-info";
import { BuildDetails } from "~/app/(application)/leads/new/_components/form-steps/build-details";
import { ContactDetails } from "~/app/(application)/leads/new/_components/form-steps/contact-details";
import { LandStatus } from "~/app/(application)/leads/new/_components/form-steps/land-status";
import { leadFormResolver } from "~/app/(application)/leads/new/_lib/schema";
import { Button } from "~/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/Card";
import type { LeadCreate } from "~/server/api/schemas/leads";
import { useTRPC } from "~/trpc/react";
import type { Lead } from "./lead-profile-view";

interface LeadEditFormProps {
  lead: Lead;
  onCancel: () => void;
  onSuccess: () => void;
}

/** Convert a Lead row into the form's default values. */
function leadToDefaults(lead: Lead): LeadCreate {
  return {
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    preferredContactTime: lead.preferredContactTime,
    hasLand: lead.hasLand,
    landRegistered: lead.landRegistered,
    landAddress: lead.landAddress,
    landSizeSqm: lead.landSizeSqm,
    landWidth: lead.landWidth,
    landDepth: lead.landDepth,
    propertyType: lead.propertyType,
    budget: lead.budget,
    seenBroker: lead.seenBroker,
    constructionTimeline: lead.constructionTimeline,
    preferredEstates: lead.preferredEstates,
    preferredSuburbs: lead.preferredSuburbs,
    leadSource: lead.leadSource,
    referrerName: lead.referrerName,
    notes: lead.notes,
    resolveFinanceOptedIn: lead.resolveFinanceOptedIn ?? false,
  };
}

export function LeadEditForm({ lead, onCancel, onSuccess }: LeadEditFormProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<LeadCreate>({
    resolver: leadFormResolver,
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: leadToDefaults(lead),
  });

  const updateLead = useMutation(
    trpc.leads.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.leads.getById.queryFilter({ id: lead.id }),
        );
        onSuccess();
      },
      onError: (error) => {
        const zodErrors = (
          error.data as {
            zodError?: { fieldErrors?: Record<string, string[]> };
          }
        )?.zodError?.fieldErrors;
        if (zodErrors) {
          for (const [field, messages] of Object.entries(zodErrors)) {
            if (messages?.[0]) {
              form.setError(field as keyof LeadCreate, {
                message: messages[0],
              });
            }
          }
        }
      },
    }),
  );

  const onSubmit = (data: LeadCreate) => {
    updateLead.mutate({ id: lead.id, ...data });
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6 pb-24"
      data-testid="lead-profile-edit-form"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactDetails form={form} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Land</CardTitle>
        </CardHeader>
        <CardContent>
          <LandStatus form={form} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Build</CardTitle>
        </CardHeader>
        <CardContent>
          <BuildDetails form={form} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">More</CardTitle>
        </CardHeader>
        <CardContent>
          <AdditionalInfo form={form} />
        </CardContent>
      </Card>

      {updateLead.error && Object.keys(form.formState.errors).length === 0 && (
        <p className="text-destructive text-sm" role="alert">
          {updateLead.error.message}
        </p>
      )}

      {/* Sticky action bar — pinned to the bottom on mobile, bottom of card stack on desktop */}
      <div
        className="fixed right-0 bottom-16 left-0 z-10 flex items-center justify-end gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-64"
        data-testid="lead-profile-edit-actions"
      >
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={onCancel}
          disabled={updateLead.isPending}
          data-testid="lead-profile-cancel-btn"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={updateLead.isPending}
          data-testid="lead-profile-save-btn"
        >
          {updateLead.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
