import type { MetadataRoute } from 'next'
import { env } from "~/env"
import { getBaseUrl } from '~/lib/canonical-url'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl()
  const allowRobots = env.ROBOTS_TXT === "Allow"

  return {
    rules: {
      userAgent: "*",
      allow: allowRobots ? "/" : undefined,
      disallow: allowRobots ? undefined : "/",
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
