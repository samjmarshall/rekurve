"use client"

import Link from "next/link"
import { SidePanel } from "../_components/side-panel"
import { UserAuthForm } from "../_components/user-auth-form"
import { buttonVariants } from "~/components/ui/button"
import { cn } from "~/lib/utils"
import { signIn } from "next-auth/react"
import { useState } from "react"

export default function Login() {
  const [isLoading, setIsLoading] = useState<boolean>(false)

  async function googleLogin() {
    setIsLoading(true)
    await signIn("google", {
      callbackUrl: "/dashboard",
    })
  }

  return (
    <div className="h-screen items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <Link
        href="/signup"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "absolute right-4 top-4 md:right-8 md:top-8",
        )}
      >
        Sign Up
      </Link>
      <SidePanel />
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
          </div>
          <UserAuthForm isLoading={isLoading} googleSubmit={googleLogin} />
          <p className="px-8 text-center text-sm text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link
              href="/terms"
              className="underline underline-offset-4 hover:text-primary"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
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
