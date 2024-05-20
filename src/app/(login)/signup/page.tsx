"use client"

import { buttonVariants } from "~/components/ui/button"
import { type SyntheticEvent, useState } from "react"

import Link from "next/link"
import { SidePanel } from "../_components/side-panel"
import { UserAuthForm } from "../_components/user-auth-form"
import { cn } from "~/lib/utils"
import { signIn } from "next-auth/react"

export default function SignUp() {
  const [isLoading, setIsLoading] = useState<boolean>(false)

  async function emailSignUp(event: SyntheticEvent) {
    event.preventDefault()
  }

  async function googleSignUp() {
    setIsLoading(true)
    await signIn("google", {
      callbackUrl: "/dashboard",
    })
  }

  return (
    <div className="grid h-screen items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0">
      <Link
        href="/login"
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
          <UserAuthForm
            isLoading={isLoading}
            emailSubmit={emailSignUp}
            googleSubmit={googleSignUp}
          />
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