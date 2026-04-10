"use client";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/Card";
import {
  formatContactTime,
  formatLeadSource,
  formatPropertyType,
  formatTimeline,
} from "../_lib/display";
import type { Lead } from "./lead-profile-view";

export function LeadDetails({ lead }: { lead: Lead }) {
  return (
    <div className="flex flex-col gap-6" data-testid="lead-profile-details">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailGrid>
            <DetailRow label="First name" value={lead.firstName} />
            <DetailRow label="Last name" value={lead.lastName} />
            <DetailRow label="Phone" value={lead.phone} />
            <DetailRow label="Email" value={lead.email} />
            <DetailRow
              label="Preferred contact time"
              value={formatContactTime(lead.preferredContactTime)}
            />
          </DetailGrid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Land</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailGrid>
            <DetailRow label="Has land" value={yesNo(lead.hasLand)} />
            <DetailRow label="Registered" value={yesNo(lead.landRegistered)} />
            <DetailRow label="Address" value={lead.landAddress} />
            <DetailRow
              label="Size"
              value={lead.landSizeSqm ? `${lead.landSizeSqm} m²` : null}
            />
            <DetailRow
              label="Dimensions"
              value={
                lead.landWidth && lead.landDepth
                  ? `${lead.landWidth} m × ${lead.landDepth} m`
                  : null
              }
            />
          </DetailGrid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Build</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailGrid>
            <DetailRow
              label="Property type"
              value={formatPropertyType(lead.propertyType)}
            />
            <DetailRow label="Budget" value={lead.budget} />
            <DetailRow label="Seen broker" value={yesNo(lead.seenBroker)} />
            <DetailRow
              label="Construction timeline"
              value={formatTimeline(lead.constructionTimeline)}
            />
          </DetailGrid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ChipField label="Preferred estates" values={lead.preferredEstates} />
          <ChipField label="Preferred suburbs" values={lead.preferredSuburbs} />
          <DetailRow
            label="Resolve Finance opt-in"
            value={yesNo(lead.resolveFinanceOptedIn)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Source</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailGrid>
            <DetailRow
              label="Lead source"
              value={formatLeadSource(lead.leadSource)}
            />
            <DetailRow label="Referrer name" value={lead.referrerName} />
            <DetailRow label="Notes" value={lead.notes} />
            <DetailRow
              label="Created"
              value={new Date(lead.createdAt).toLocaleDateString()}
            />
          </DetailGrid>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {children}
    </dl>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  const display = value && value !== "Not provided" ? value : null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </dt>
      <dd
        className={
          display ? "text-sm" : "text-muted-foreground/60 text-sm italic"
        }
      >
        {display ?? "Not provided"}
      </dd>
    </div>
  );
}

function ChipField({
  label,
  values,
}: {
  label: string;
  values: string[] | null | undefined;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </span>
      {values && values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value) => (
            <span
              key={value}
              className="rounded-md border border-border bg-secondary/40 px-2 py-0.5 text-xs"
            >
              {value}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground/60 text-sm italic">
          Not provided
        </span>
      )}
    </div>
  );
}

function yesNo(value: boolean | null | undefined): string | null {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return null;
}
