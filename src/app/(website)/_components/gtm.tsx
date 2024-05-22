import Script from "next/script"
import { env } from "~/env"

export function GoogleTagManager({ nonce }: { nonce?: string }) {
  return (
    <>
      <Script
        id="gtm-init"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `
      (function(w,l){
        w[l]=w[l]||[];
        w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
      })(window,'dataLayer');`,
        }}
      />
      <Script
        id="gtm"
        nonce={nonce}
        src={`https://www.googletagmanager.com/gtm.js?id=${env.GOOGLE_TAG_MANAGER_ID}`}
      />
    </>
  )
}
