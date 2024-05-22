import { env } from "~/env"

declare global {
  interface Window {
    grecaptcha?: {
      enterprise?: {
        ready: (callback: () => void) => void
        execute: (siteKey: string, options: { action: string }) => Promise<string>
      }
    }
  }
}

export const executeRecaptcha = async (
  action: string,
): Promise<string | null> =>
  await new Promise<string | null>((resolve) => {
    if (window.grecaptcha?.enterprise) {
      window.grecaptcha.enterprise.ready(() => {
        window.grecaptcha?.enterprise?.execute(env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, { action })
          .then((token: string) => {
            resolve(token)
          })
          .catch(() => {
            resolve(null)
          })
      })
    } else {
      resolve(null)
    }
  })
