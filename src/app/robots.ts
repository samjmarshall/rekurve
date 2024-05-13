import { type MetadataRoute } from "next";

import { env } from "~/env";

export default function robots(): MetadataRoute.Robots {
  const allowRobots = env.ROBOTS_TXT === "Allow";
  return {
    rules: {
      userAgent: "*",
      allow: allowRobots ? "/" : undefined,
      disallow: allowRobots ? undefined : "/",
    },
    sitemap: `${env.BASE_URL}/sitemap.xml`,
  };
}
