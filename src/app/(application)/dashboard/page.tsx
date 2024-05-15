import { CreatePost } from "~/components/create-post"
import { api } from "~/trpc/server"
import { getServerAuthSession } from "~/server/auth"

export default async function Home() {
  const session = await getServerAuthSession()

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-12 px-4 py-16">
      <p className="text-center text-2xl">
        {session ? (
          <span>Logged in as {session.user?.name}</span>
        ) : (
          <span>Not logged in</span>
        )}
      </p>

      {session?.user ? <CrudShowcase /> : null}
    </div>
  )
}

async function CrudShowcase() {
  const latestPost = await api.post.getLatest()

  return (
    <div className="w-full max-w-xs">
      {latestPost ? (
        <p className="truncate">Your most recent message: {latestPost.name}</p>
      ) : (
        <p>You have no messages yet.</p>
      )}

      <CreatePost />
    </div>
  )
}
