import { type OpenGraph } from "next/dist/lib/metadata/types/opengraph-types"
import { getBaseUrl } from "./canonical-url"

const openGraph: OpenGraph = {
  type: "website",
  locale: "en_AU",
  url: getBaseUrl(),
  title: "AI Quote Automation for Service Businesses | Rekurve",
  description:
    "Recover 20+ hours weekly or add $100K to your pipeline in 90 days with AI service quote automation.",
  siteName: "Rekurve AI",
  images: [
    {
      url: "/og-image.png",
      width: 1200,
      height: 630,
      alt: "Rekurve AI - Quote Automation for Service Businesses",
    },
  ],
}

export default openGraph
