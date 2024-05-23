import "~/styles/globals.css"

import { type Metadata, type Viewport } from "next"

import { Inter as FontSans } from "next/font/google"
import WebsiteFooter from "./_components/footer"
import WebsiteHeader from "./_components/header"
import openGraph from "~/lib/open-graph"
// import { headers } from "next/headers"
import { env } from "~/env"
import Script from "next/script"

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
}

export const metadata: Metadata = {
  title: {
    default: env.COMPANY_NAME,
    template: `%s | ${env.COMPANY_NAME}`,
  },
  description:
    "Construction management software to stay organized, track progress, costs and payments, and collaborate with your customers.",
  publisher: env.COMPANY_NAME,
  openGraph,
  icons: [{ rel: "icon", url: "/favicon.ico" }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // const nonce = headers().get("x-nonce")

  // if (!nonce) {
  //   throw new Error("Missing nonce header")
  // }

  return (
    <html lang="en">
      <head>
        <Script
          id="gtm-init"
          // nonce={nonce}
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
          // nonce={nonce}
          async
          src="https://www.googletagmanager.com/gtm.js?id=GTM-KQSV96ST"
        />
      </head>
      <body className={`font-sans antialiased ${fontSans.variable}`}>
        <div className="flex min-h-[100dvh] flex-col">
          <WebsiteHeader />
          {children}
          <WebsiteFooter />
        </div>
      </body>
    </html>
  )
}
