import { env } from "~/env"

export default function CanonicalLink({ pathname }: { pathname: string }) {
  return <link rel="canonical" href={`${env.BASE_URL}${pathname}`} />
}
