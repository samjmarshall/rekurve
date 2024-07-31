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

  if (!session?.user) {
    redirect("/signup")
  }

  const hasSubscription = await api.billing.userHasSubscription()

  // Don't allow users to access onboarding if they already have a subscription
  // Users with a subscription should upgrade or downgrade their plan via the billing portal
  if (hasSubscription) {
    redirect("/dashboard")
  }

  return (
    <html lang="en">
      <body className={`font-sans antialiased ${fontSans.variable}`}>
        <div className="flex h-full min-h-[100dvh] w-full items-center justify-center">
          {children}
        </div>
      </body>
    </html>
  )
}
