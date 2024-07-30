import "~/styles/globals.css"

import { type Metadata, type Viewport } from "next"

import { Inter as FontSans } from "next/font/google"
import openGraph from "~/lib/open-graph"
import { getServerAuthSession } from "~/server/auth"
import { redirect } from "next/navigation"
import { api } from "~/trpc/server"

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
    default: "Onboarding | rekurve",
    template: "%s | rekurve",
  },
  description:
    "Construction management software to stay organized, track progress, costs and payments, and collaborate with your customers.",
  publisher: "rekurve",
  openGraph,
  icons: [{ rel: "icon", url: "/favicon.ico" }],
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerAuthSession()

  if (session?.user) {
    redirect("/signup")
  }

  const hasSub = await api.billing.userHasSubscription()
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${fontSans.variable}`}>
        <div className="flex min-h-[100dvh]">
          {hasSub ? (
            <div className="flex h-full w-full items-center justify-center">
              <h2 className="mb-6 text-4xl font-bold">
                You&apos;re already onboard!
              </h2>
            </div>
          ) : (
            children
          )}
        </div>
      </body>
    </html>
  )
}
