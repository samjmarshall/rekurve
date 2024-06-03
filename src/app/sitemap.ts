import { type MetadataRoute } from "next"
import { env } from "~/env"

export const runtime = "edge"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: env.BASE_URL,
    },
  ]
}
