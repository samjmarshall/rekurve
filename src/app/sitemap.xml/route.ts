import { NextResponse } from "next/server"
import { env } from "~/env"

interface Location {
  loc: string
  lastmod?: unknown
}

export function GET(): NextResponse {
  const locations: Location[] = [{ loc: new URL(env.BASE_URL).toString() }]

  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locations
      .map(
        ({ loc, lastmod }) => `
  <url>
    <loc>${loc}</loc>${
      typeof lastmod === "string"
        ? `
    <lastmod>${lastmod}</lastmod>`
        : ""
    }
  </url>`,
      )
      .join("")}
</urlset>
`,
    {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=59",
        "Content-Type": "application/xml; charset=utf-8",
      },
    },
  )
}
