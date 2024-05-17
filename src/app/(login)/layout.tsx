import "~/styles/globals.css"

import { type Metadata, type Viewport } from "next"

import { Inter as FontSans } from "next/font/google"
import openGraph from "~/lib/open-graph"
import { getServerAuthSession } from "~/server/auth"
import { redirect } from "next/navigation"

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
    default: "Login | rekurve",
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
    redirect("/dashboard")
  }

  return (
    <html lang="en">
      <body className={`font-sans antialiased ${fontSans.variable}`}>
        <div className="flex min-h-[100dvh] flex-col">{children}</div>
      </body>
    </html>
  )
}
