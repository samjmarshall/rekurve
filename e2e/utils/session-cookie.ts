/**
 * Build a Playwright cookie descriptor for better-auth, deriving the domain
 * from the Playwright baseURL so it works against both localhost and deployed
 * Vercel preview/production URLs.
 */
export function getSessionCookie(signedToken: string, baseURL: string) {
  const { hostname } = new URL(baseURL);
  return {
    name: "better-auth.session_token",
    value: signedToken,
    domain: hostname,
    path: "/",
  };
}
