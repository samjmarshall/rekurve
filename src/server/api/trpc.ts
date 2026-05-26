import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { aiLimiter } from "~/lib/rate-limit";
import { getSession } from "~/lib/session";
import { db } from "~/server/db";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await getSession();

  return {
    db,
    session,
    ...opts,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  if (t._config.isDev) {
    const end = Date.now();
    console.log(`[TRPC] ${path} took ${end - start}ms to execute`);
  }

  return result;
});

export const publicProcedure = t.procedure.use(timingMiddleware);

export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });

const aiRateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
  const userId = ctx.session?.user?.id;
  if (!userId) {
    // Belt-and-braces: protectedProcedure narrows this, but guards against
    // a future re-ordering that could silently key on undefined.
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  let result: { success: boolean; reset: number };
  try {
    result = await aiLimiter.limit(userId);
  } catch (err) {
    console.warn("[ai-rate-limit] limiter unavailable, failing open", err);
    return next();
  }

  if (!result.success) {
    console.info("[ai-rate-limit] limit exceeded", {
      userId,
      reset: result.reset,
    });
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "AI request limit exceeded. Please try again later.",
      cause: { reset: result.reset },
    });
  }

  return next();
});

export const aiProcedure = protectedProcedure.use(aiRateLimitMiddleware);
