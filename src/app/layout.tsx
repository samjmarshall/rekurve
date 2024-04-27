import "~/styles/globals.css";

import { Inter as FontSans } from "next/font/google";
import { Header } from "~/components/header";
import { TRPCReactProvider } from "~/trpc/react";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});
export const metadata = {
  title: "rekurve",
  description: "Composite construction management system.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`font-sans antialiased ${fontSans.variable} h-screen w-screen overflow-hidden`}
      >
        <TRPCReactProvider>
          <Header />
          <main className="h-full">{children}</main>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
