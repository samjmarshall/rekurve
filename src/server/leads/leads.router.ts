import "server-only";

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  leadCreateSchema,
  leadFilterSchema,
  leadUpdateSchema,
  pipelineFiltersSchema,
} from "~/domain/leads/schemas";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { LeadNotFoundError } from "./leads.errors";
import type { LeadsService } from "./leads.service";

// Domain-error mapping: the service throws transport-agnostic errors
// (leads.errors.ts); this adapter owns their tRPC representation.
function toTRPCError(err: unknown): never {
  if (err instanceof LeadNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
  }
  throw err;
}

// Thin tRPC adapter (adr020): zod, auth, domain-error mapping — no queries.
// Procedure names and shapes are byte-stable (router-paths golden pins them).
export function makeLeadsRouter({ service }: { service: LeadsService }) {
  return createTRPCRouter({
    create: protectedProcedure
      .input(leadCreateSchema)
      .mutation(({ ctx, input }) =>
        service.captureLead(input, { userId: ctx.session.user.id }),
      ),

    getById: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input }) => {
        const lead = await service.getById(input.id);
        if (!lead) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
        }
        return lead;
      }),

    list: protectedProcedure
      .input(leadFilterSchema)
      .query(({ input }) => service.list(input)),

    update: protectedProcedure
      .input(leadUpdateSchema)
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return service
          .updateLead(id, data, { userId: ctx.session.user.id })
          .catch(toTRPCError);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ input }) => {
        const deleted = await service.deleteLead(input.id);
        if (!deleted) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
        }
        return deleted;
      }),

    getByStage: protectedProcedure
      .input(pipelineFiltersSchema)
      .query(({ input }) => service.getByStage(input)),
  });
}
