import { env } from "~/env"

export const canonicalUrl = (pagePath = "") =>
  `${env.BASE_URL}${addForwardSlashIfNeeded(pagePath)}${pagePath}`

const addForwardSlashIfNeeded = (path: string) =>
  path && path.length > 0 && !path.startsWith("/") ? "/" : ""
