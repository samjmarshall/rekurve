import "server-only";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { toTRPCError } from "~/server/api/trpc-error-map";
import type { MessagingService } from "./messaging.service";
import {
  conversationsListSchema,
  messageApproveSchema,
  messageDismissSchema,
  messageEditAndApproveSchema,
  messageSnoozeSchema,
} from "./messaging-schemas";

// Thin tRPC adapter (adr020): zod, auth, domain-error mapping — no queries.
// Procedure names and shapes are byte-stable (router-paths golden pins them).
export function makeMessagesRouter({ service }: { service: MessagingService }) {
  return createTRPCRouter({
    listPending: protectedProcedure.query(({ ctx }) =>
      service.listPending({ userId: ctx.session.user.id }),
    ),

    approve: protectedProcedure
      .input(messageApproveSchema)
      .mutation(({ ctx, input }) =>
        service
          .approve(input, { userId: ctx.session.user.id })
          .catch(toTRPCError),
      ),

    editAndApprove: protectedProcedure
      .input(messageEditAndApproveSchema)
      .mutation(({ ctx, input }) =>
        service
          .editAndApprove(input, { userId: ctx.session.user.id })
          .catch(toTRPCError),
      ),

    snooze: protectedProcedure
      .input(messageSnoozeSchema)
      .mutation(({ ctx, input }) =>
        service
          .snooze(input, { userId: ctx.session.user.id })
          .catch(toTRPCError),
      ),

    dismiss: protectedProcedure
      .input(messageDismissSchema)
      .mutation(({ ctx, input }) =>
        service
          .dismiss(input.id, { userId: ctx.session.user.id })
          .catch(toTRPCError),
      ),
  });
}

// The conversations surface is a read-model over the messaging domain, not a
// domain of its own — one lead-scoped history query, served by the same service.
export function makeConversationsRouter({
  service,
}: {
  service: MessagingService;
}) {
  return createTRPCRouter({
    list: protectedProcedure
      .input(conversationsListSchema)
      .query(({ ctx, input }) =>
        service.listConversations(input, { userId: ctx.session.user.id }),
      ),
  });
}
