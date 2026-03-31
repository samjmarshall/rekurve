/**
 * Build a Playwright cookie descriptor for better-auth, deriving the domain
 * and cookie name from the Playwright baseURL so it works against both
 * localhost (HTTP) and deployed Vercel preview/production URLs (HTTPS).
 *
 * better-auth prefixes cookie names with `__Secure-` when the protocol is
 * HTTPS, and those cookies require the `secure` flag.
 */
export function getSessionCookie(signedToken: string, baseURL: string) {
  const { hostname, protocol } = new URL(baseURL);
  const isSecure = protocol === "https:";
  const prefix = isSecure ? "__Secure-" : "";
  return {
    name: `${prefix}better-auth.session_token`,
    value: signedToken,
    domain: hostname,
    path: "/",
    secure: isSecure,
  };
}
