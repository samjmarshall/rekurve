import Link from "next/link"
import Script from "next/script"
import { SidePanel } from "../_components/side-panel"
import { UserAuthForm } from "../_components/user-auth-form"
import { buttonVariants } from "~/components/ui/button"
import { cn } from "~/lib/utils"
import { env } from "~/env"
import jsonLd from "~/lib/json-ld"
import openGraph from "~/lib/open-graph"

export const metadata = {
  title: "Sign Up",
  description:
    "Sign up for a free account. See for yourself how rekurve can help you manage and grow your construction business.",
  openGraph: {
    ...openGraph,
    title: "Sign Up | rekurve",
    description:
      "Sign up for a free account. See for yourself how rekurve can help you manage and grow your construction business.",
    url: `${env.BASE_URL}/login`,
  },
  robots: { index: false, follow: false },
}

export default function SignUp() {
  return (
    <div className="grid h-screen items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0">
      <Script
        id="json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            urlPath: "signup",
            title: metadata.title,
            description: metadata.description,
          }),
        }}
      />
      <Link
        href="/login"
        title="Login"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "absolute right-4 top-4 md:right-8 md:top-8",
        )}
      >
        Login
      </Link>
      <SidePanel />
      <div className="lg:p-8">
        <div className="mx-auto flex w-full max-w-[350px] flex-col justify-center space-y-6">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Create an account
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your email below to create your account
            </p>
          </div>
          <UserAuthForm email />
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
