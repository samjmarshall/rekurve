import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"

import { CreatePost } from "~/components/create-post"
import { api } from "~/trpc/server"
import { getServerAuthSession } from "~/server/auth"

export default async function Home() {
  const session = await getServerAuthSession()
  const subscriptions = await api.billing.userSubscriptions()
  const plan = subscriptions[0]?.items.data[0]?.plan

  let product

  if (typeof plan?.product === "string") {
    product = await api.billing.getProductById({
      id: plan.product,
    })
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-12 px-4 py-16">
      <p className="text-center text-2xl">
        {session && <span>Logged in as {session.user?.name}</span>}
      </p>
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-700">{product?.name}</CardTitle>
            <CardDescription>Your current plan.</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {plan?.currency?.toUpperCase()} $
            {plan?.amount ? plan.amount / 100 : 0} per {plan?.interval}
          </CardContent>
        </Card>
      </div>

      <CrudShowcase />
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
