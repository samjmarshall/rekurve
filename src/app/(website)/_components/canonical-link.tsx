import { env } from "~/env"
import { headers } from "next/headers"

export default function CanonicalLink() {
  const pathname = headers().get("x-pathname")

  if (!pathname) {
    throw new Error("Missing x-pathname header")
  }

  return <link rel="canonical" href={`${env.BASE_URL}${pathname}`} />
}
