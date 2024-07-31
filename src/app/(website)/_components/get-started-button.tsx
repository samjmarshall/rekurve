"use client"

import { buttonVariants } from "~/components/ui/button"
import Link, { type LinkProps } from "next/link"
import { type RouteType } from "next/dist/lib/load-custom-routes"
import { useState } from "react"
import { LoaderCircle } from "lucide-react"
import { cn } from "~/lib/utils"

export default function GetStartedButton({ href }: LinkProps<RouteType>) {
  const [loading, setLoading] = useState(false)

  return (
    <Link
      className={cn(
        buttonVariants(),
        "ml-4 w-full",
        loading ? "pointer-events-none opacity-50" : "",
      )}
      title="Get Started"
      aria-disabled={loading}
      href={href}
      onClick={() => {
        setLoading(true)
      }}
    >
      {loading ? (
        <LoaderCircle className="h-5 w-5 animate-spin" />
      ) : (
        "Get Started"
      )}
    </Link>
  )
}
