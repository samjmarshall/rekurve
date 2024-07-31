import "~/styles/globals.css"

import { Inter } from "next/font/google"
import { Header } from "~/components/header"
import { type Viewport, type Metadata } from "next"
import { TRPCReactProvider } from "~/trpc/react"
import { getServerAuthSession } from "~/server/auth"
import { redirect } from "next/navigation"
import { api } from "~/trpc/server"

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
  title: "rekurve",
  description: "Composite construction management system.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerAuthSession()

  if (!session?.user) {
    redirect("/")
  }

  const hasSubscription = await api.billing.userHasSubscription()

  if (!hasSubscription) {
    redirect("/onboarding")
  }

  // FYI: In the event you need to add an inline or third-party script that requires. This is how to add the CSP nonce.
  // import { headers } from "next/headers"
  // const nonce = headers().get("x-nonce")
  // if (!nonce) {
  //   throw new Error("Missing nonce header")
  // }
  // <Script nonce={nonce} />

  return (
    <html lang="en">
      <body
        className={`font-sans antialiased ${fontSans.variable} h-screen w-screen`}
      >
        <TRPCReactProvider>
          <Header />
          <main className="h-full">{children}</main>
        </TRPCReactProvider>
      </body>
    </html>
  )
}
