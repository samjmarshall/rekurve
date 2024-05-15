/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import Script from "next/script"
import { env } from "~/env"

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    grecaptcha: any
  }
}

export const executeRecaptcha = async (
  action: string,
): Promise<string | null> =>
  await new Promise<string | null>((resolve) => {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (window.grecaptcha.enterprise) {
      window.grecaptcha.enterprise.ready(() => {
        window.grecaptcha.enterprise
          .execute(env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, { action })
          .then((token: string) => {
            resolve(token)
          })
          .catch(() => {
            resolve(null)
          })
      })
    } else {
      console.error("window.grecaptcha.enterprise => undefined")
      resolve(null)
    }
  })

export const loadRecaptcha = () => (
  <Script
    src={`https://www.google.com/recaptcha/enterprise.js?render=${env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
  />
)
