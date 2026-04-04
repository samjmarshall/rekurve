import type { Metadata } from "next";
import { LeadForm } from "./_components/lead-form";

export const metadata: Metadata = {
  title: "New Lead | Rekurve",
};

export default function NewLeadPage() {
  return (
    <div className="flex flex-1 flex-col">
      <LeadForm />
    </div>
  );
}
