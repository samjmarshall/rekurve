// dotenv MUST be imported first so process.env is populated before ~/env is evaluated
import "dotenv/config";

import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, rs, test } from "@rstest/core";
import { and, sql as dsql, eq, inArray } from "drizzle-orm";

// Integration: prove that messages.approve for the email channel writes the
// status flip AND the message.approval-requested outbox row atomically against
// real Neon (the db.batch path), and that no row is written twice. Mirrors the
// outbox sweep integration idiom — mocks ~/inngest/client so post-commit send
// is a no-op, but exercises the real outbox + batch logic end to end.

describe.skipIf(!process.env.INTEGRATION_DB)(
  "messages.approve → outbox (integration)",
  () => {
    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const userId = `int-user-${suffix}`;
    const leadId = randomUUID();
    const messageId = randomUUID();
    const email = `int-${suffix}@test.rekurve.dev`;

    afterAll(async () => {
      const { db } = await import("~/server/db");
      const schema = await import("~/server/db/schema");
      // outbox rows we created are keyed by payload.messageId
      await db
        .delete(schema.outbox)
        .where(dsql`${schema.outbox.payload}->>'messageId' = ${messageId}`);
      await db
        .delete(schema.messageQueue)
        .where(inArray(schema.messageQueue.id, [messageId]));
      await db.delete(schema.leads).where(inArray(schema.leads.id, [leadId]));
      // ms_graph_tokens cascades on user delete
      const { user } = await import("~/server/db/schema/auth");
      await db.delete(user).where(inArray(user.id, [userId]));
    });

    test("email approve enqueues exactly one approval-requested row and flips status", async () => {
      rs.resetModules();

      const mockSend = rs.fn().mockResolvedValue([]);
      rs.doMock("~/inngest/client", () => ({
        inngest: {
          createFunction: rs.fn().mockReturnValue({}),
          send: mockSend,
        },
      }));
      rs.doMock("~/lib/session", () => ({
        getSession: rs.fn().mockResolvedValue({
          user: { id: userId, email, name: "Integration User" },
          session: { id: `int-session-${suffix}` },
        }),
      }));

      const { db } = await import("~/server/db");
      const schema = await import("~/server/db/schema");
      const { user } = await import("~/server/db/schema/auth");
      const { createCaller } = await import("../root");
      const { createTRPCContext } = await import("../trpc");

      // Seed: user → lead → MS Graph tokens → pending email message.
      await db.insert(user).values({ id: userId, name: "Integration", email });
      await db.insert(schema.leads).values({
        id: leadId,
        firstName: "Int",
        lastName: "Test",
        email,
        hubspotContactId: `hs-int-${suffix}`,
      });
      await db.insert(schema.msGraphTokens).values({
        userId,
        accessToken: "int-access-token",
        refreshToken: "int-refresh-token",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        microsoftUserId: "int-ms-user",
        email,
      });
      await db.insert(schema.messageQueue).values({
        id: messageId,
        leadId,
        channel: "email",
        subject: "Integration subject",
        body: "Integration body",
        status: "pending",
        priority: 50,
      });

      const ctx = await createTRPCContext({ headers: new Headers() });
      const caller = createCaller(ctx);
      const result = await caller.messages.approve({ id: messageId });

      // Mutation returns immediately with the approved row.
      expect(result.status).toBe("approved");
      expect(result.approvedAt).not.toBeNull();
      // Not sent yet — the worker owns sentAt.
      expect(result.sentAt).toBeNull();

      // Exactly one outbox row, carrying the correlation payload.
      const rows = await db
        .select()
        .from(schema.outbox)
        .where(
          and(
            eq(schema.outbox.eventName, "message.approval-requested"),
            dsql`${schema.outbox.payload}->>'messageId' = ${messageId}`,
          ),
        );
      expect(rows).toHaveLength(1);
      expect(rows[0]!.payload).toMatchObject({
        messageId,
        correlationId: messageId,
        channel: "email",
        leadId,
      });

      // The status flip persisted in the same batch.
      const [persisted] = await db
        .select({ status: schema.messageQueue.status })
        .from(schema.messageQueue)
        .where(eq(schema.messageQueue.id, messageId));
      expect(persisted!.status).toBe("approved");

      // Post-commit send was attempted once for our event id.
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ name: "message.approval-requested" }),
      );
    });
  },
);
