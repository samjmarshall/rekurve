import Script from "next/script"

export function GoogleRecaptcha({
  // nonce,
  siteKey,
}: {
  // nonce: string
  siteKey: string
}) {
  return (
    <Script
      id="recaptcha-enterprise"
      // nonce={nonce}
      src={`https://www.google.com/recaptcha/enterprise.js?render=${siteKey}`}
    />
  )
}
