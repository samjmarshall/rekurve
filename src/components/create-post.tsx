"use client"

import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { api } from "~/trpc/react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function CreatePost() {
  const router = useRouter()
  const [name, setName] = useState("")

  const createPost = api.post.create.useMutation({
    onSuccess: () => {
      router.refresh()
      setName("")
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        createPost.mutate({ name })
      }}
      className="flex flex-col gap-2"
    >
      <Input
        placeholder="Message..."
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-4 py-2"
      />
      <Button
        // variant="default"
        type="submit"
        className="font-semibold transition"
        disabled={createPost.isPending}
      >
        {createPost.isPending ? "Submitting..." : "Submit"}
      </Button>
    </form>
  )
}
