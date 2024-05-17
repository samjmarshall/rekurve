"use client"

import { useEffect, useState } from "react"

function getWindowDimensions() {
  const { window } = globalThis
  return {
    width: window?.innerWidth ?? 1920,
    height: window?.innerHeight ?? 1080,
  }
}

export function useWindowSize() {
  const [windowDimensions, setWindowDimensions] = useState(
    getWindowDimensions(),
  )

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions())
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return windowDimensions
}
