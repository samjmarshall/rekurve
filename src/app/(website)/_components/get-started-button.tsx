"use client"

import { Button } from "~/components/ui/button"
import Link, { type LinkProps } from "next/link"
import { type RouteType } from "next/dist/lib/load-custom-routes"
import { useState } from "react"
import { LoaderCircle } from "lucide-react"

export default function GetStartedButton({ href }: LinkProps<RouteType>) {
  const [loading, setLoading] = useState(false)

  return (
    <Button
      asChild
      disabled={loading}
      onClick={() => {
        setLoading(true)
      }}
      className="ml-4 w-full"
    >
      <Link title="Get Started" href={href}>
        {loading ? (
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : (
          "Get Started"
        )}
      </Link>
    </Button>
  )
}
