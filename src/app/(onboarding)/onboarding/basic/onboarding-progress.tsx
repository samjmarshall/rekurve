"use client"

import { useEffect, useState } from "react"

import { Progress } from "~/components/ui/progress"

export default function OnboardingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    setProgress(33)
  }, [])

  return (
    <>
      <Progress className="my-2 w-full" value={progress} />
      <span>{progress}% Complete</span>
    </>
  )
}
