import Link from "next/link"
import { SidePanel } from "../_components/side-panel"
import { UserAuthForm } from "../_components/user-auth-form"
import { buttonVariants } from "~/components/ui/button"
import { cn } from "~/lib/utils"
import { env } from "~/env"
import openGraph from "~/lib/open-graph"

export const metadata = {
  title: "Login",
  description:
    "Login to your account to manage your construction projects, estimates, invoices, and more.",
  openGraph: {
    ...openGraph,
    title: "Login | rekurve",
    description:
      "Login to your account to manage your construction projects, estimates, invoices, and more.",
    url: `${env.BASE_URL}/login`,
  },
  robots: { index: false, follow: false },
}

export default function Login() {
  return (
    <div className="grid h-screen items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0">
      <Link
        href="/signup"
        title="Sign Up"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "absolute right-4 top-4 md:right-8 md:top-8",
        )}
      >
        Sign Up
      </Link>
      <SidePanel />
      <div className="lg:p-8">
        <div className="mx-auto flex w-full max-w-[350px] flex-col justify-center space-y-6">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
          </div>
          <UserAuthForm />
          <p className="px-8 text-center text-sm text-muted-foreground">
            By continuing, you agree to our{" "}
            {/* <Link
              href="/terms"
              className="underline underline-offset-4 hover:text-primary"
            >
              Terms of Service
            </Link>{" "}
            and{" "} */}
            <Link
              href="/privacy"
              title="Privacy Policy"
              className="underline underline-offset-4 hover:text-primary"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
