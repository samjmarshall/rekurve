import { type OpenGraph } from "next/dist/lib/metadata/types/opengraph-types"
import { env } from "~/env"

const openGraph: OpenGraph = {
  type: "website",
  locale: "en_US",
  url: env.BASE_URL,
  title: "rekurve",
  description:
    "Construction management software to stay organized, track progress, costs and payments, and collaborate with your customers.",
  siteName: "rekurve",
  images: [
    {
      alt: "rekurve",
      url: `${env.BASE_URL}/assets/logo-512x512.png`,
      secureUrl: `${env.BASE_URL}/assets/logo-512x512.png`,
      type: "image/png",
      width: 512,
      height: 512,
    },
  ],
}

export default openGraph
