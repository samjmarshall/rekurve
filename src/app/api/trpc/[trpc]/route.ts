import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

export function responseMeta({
  errors,
}: {
  errors: readonly { cause?: unknown }[];
}) {
  const reset = (errors[0]?.cause as { reset?: number } | undefined)?.reset;
  if (typeof reset !== "number") return {};
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return { headers: new Headers({ "Retry-After": String(retryAfter) }) };
}

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    responseMeta,
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
