export const canonicalUrl = (pagePath = "") =>
  `${getBaseUrl()}${addForwardSlashIfNeeded(pagePath)}${pagePath}`;

const addForwardSlashIfNeeded = (path: string) =>
  path && path.length > 0 && !path.startsWith("/") ? "/" : "";

export function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
