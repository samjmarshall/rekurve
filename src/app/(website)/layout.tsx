import "~/styles/globals.css"

import { type Metadata, type Viewport } from "next"

import { Inter as FontSans } from "next/font/google"
import WebsiteFooter from "./_components/footer"
import WebsiteHeader from "./_components/header"
import openGraph from "~/lib/open-graph"

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
    default: "rekurve",
    template: "%s | rekurve",
  },
  description:
    "Construction management software to stay organized, track progress, costs and payments, and collaborate with your customers.",
  publisher: "rekurve",
  openGraph,
  icons: [{ rel: "icon", url: "/favicon.ico" }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`font-sans antialiased dark:bg-slate-950 ${fontSans.variable}`}
      >
        <div className="flex min-h-[100dvh] flex-col">
          <WebsiteHeader />
          {children}
          <WebsiteFooter />
        </div>
      </body>
    </html>
  )
}
