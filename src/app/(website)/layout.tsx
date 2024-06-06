import "~/styles/globals.css"

import { type Metadata, type Viewport } from "next"

import { Inter } from "next/font/google"
import WebsiteHeader from "./_components/header"
import openGraph from "~/lib/open-graph"
import { env } from "~/env"
import Script from "next/script"
import WebsiteFooter from "./_components/footer"
import CanonicalLink from "../../components/canonical-link"

export const runtime = "edge"

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  fallback: ["system-ui", "sans-serif"],
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
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  keywords: ["construction management software"],
  openGraph,
  publisher: env.COMPANY_NAME,
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
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
          async
          defer
          src="https://www.googletagmanager.com/gtm.js?id=GTM-KQSV96ST"
        />
        <Script
          id="hs-script-loader"
          async
          defer
          src="https://js.hs-scripts.com/46219156.js"
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
