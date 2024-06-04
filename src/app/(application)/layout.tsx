import "~/styles/globals.css"

import { Inter as FontSans } from "next/font/google"
import { Header } from "~/components/header"
import { type Viewport, type Metadata } from "next"
import { TRPCReactProvider } from "~/trpc/react"
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
