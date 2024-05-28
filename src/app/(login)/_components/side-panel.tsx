"use client"

import { type SyntheticEvent, useEffect, useState } from "react"

import Image from "next/image"
import Link from "next/link"
import { Logo } from "~/components/logo"
import { useWindowSize } from "~/hooks/use-window-size"

export function SidePanel() {
  const { width, height } = useWindowSize()
  const [loadImage, setLoadImage] = useState<boolean>(false)

  useEffect(() => {
    // Ensures the value is a valid integer or float
    if (Number.isFinite(width)) {
      setLoadImage(true)
    }
  }, [width])

  return (
    <div className="relative hidden h-screen flex-col overflow-hidden bg-muted p-10 text-white lg:flex dark:border-r">
      <div className="absolute inset-0 bg-black" />
      {loadImage && (
        <Image
          src="/assets/login-background.webp"
          width={width / 2}
          height={height}
          alt="background image"
          className="absolute inset-0 w-full opacity-0 transition-opacity duration-300 ease-linear"
          onLoad={(e: SyntheticEvent) =>
            (e.target as HTMLImageElement).classList.remove("opacity-0")
          }
        />
      )}

      <Link
        className="relative z-20 flex items-center text-3xl"
        title="Home"
        href="/"
      >
        <Logo />
      </Link>
      <div className="relative z-20 mt-auto">
        <blockquote className="space-y-2">
          <p className="text-lg">
            &ldquo;This solution has saved me countless hours of work and helped
            me deliver outstanding homes to my clients faster than ever
            before.&rdquo;
          </p>
          <footer className="text-sm">Bob the Builder</footer>
        </blockquote>
      </div>
    </div>
  )
}
