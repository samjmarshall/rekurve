import Script from "next/script"
import { env } from "~/env"

export function AnalyticsBody() {
  if (env.NODE_ENV !== "production") {
    return null
  }

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  )
}

export function AnalyticsHead() {
  if (env.NODE_ENV !== "production") {
    return null
  }

  return (
    <>
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        async
        src={`https://www.googletagmanager.com/gtm/js?id=${env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID}`}
      />
      <Script
        id="gtm-config"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID}');
          `,
        }}
      />
    </>
  )
}
