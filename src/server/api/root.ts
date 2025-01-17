import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc"

import { billingRouter } from "./routers/billing"
import { postRouter } from "~/server/api/routers/post"
import { userRouter } from "./routers/user"
import { waitlistRouter } from "~/server/api/routers/waitlist"

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  billing: billingRouter,
  post: postRouter,
  user: userRouter,
  waitlist: waitlistRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter)
