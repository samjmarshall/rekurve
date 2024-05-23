import Script from "next/script"
import { env } from "process"

export function GoogleRecaptcha({ nonce }: { nonce?: string }) {
  return (
    <Script
      id="recaptcha-enterprise"
      strategy="lazyOnload"
      nonce={nonce}
      src={`https://www.google.com/recaptcha/enterprise.js?render=${env.RECAPTCHA_SITE_KEY}`}
    />
  )
}
