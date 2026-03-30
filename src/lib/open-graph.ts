import type { OpenGraph } from "next/dist/lib/metadata/types/opengraph-types";
import { getBaseUrl } from "./canonical-url";

const openGraph: OpenGraph = {
  type: "website",
  locale: "en_AU",
  url: getBaseUrl(),
  title: "AI Quote Generation & Speed to Lead | Rekurve",
  description:
    "Customer Enquiry → Quote Generated → Job Booked. AI agents for service businesses spending 20+ hours weekly quoting or missing leads.",
  siteName: "Rekurve AI",
  images: [
    {
      url: "/og-image.png",
      width: 1200,
      height: 630,
      alt: "Rekurve AI - Quote Generation & Speed to Lead for Service Businesses",
    },
  ],
};

export default openGraph;
