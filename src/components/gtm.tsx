import Script from "next/script"
import { env } from "~/env"

export function GoogleTagManager() {
  if (env.NODE_ENV !== "production") {
    return null
  }

  return (
    <>
      <Script
        id="gtm-init"
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
        src={`https://www.googletagmanager.com/gtm.js?id=${env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID}`}
      />
    </>
  )
}
