import { beforeAll, describe, expect, rs, test } from "@rstest/core";

import type { EventName } from "~/server/inngest/events";

/**
 * Golden invariant test (#325): pins the externally-visible Inngest contract —
 * function ids, trigger event names + if-expressions, crons, concurrency
 * keys/limits, retries, and onFailure presence. These are stable external
 * identifiers (run history, concurrency scoping, deployed triggers); any drift
 * must be a deliberate decision recorded in an ADR, never a refactor side
 * effect. Expectations are inline literals on purpose — update them only when
 * the contract itself changes.
 */

// InngestFunction stores the createFunction options verbatim on `opts`
// (triggers normalized to an array); `id()` returns the configured id.
type IntrospectedFn = {
  id: () => string;
  opts: {
    triggers?: {
      cron?: string;
      // `event` is a plain name string today; an EventType instance (with
      // `.name`) once typed triggers land. Both carry the same contract.
      event?: string | { name: string };
      if?: string;
    }[];
    concurrency?: { key?: string; limit?: number }[];
    retries?: number;
    onFailure?: unknown;
  };
};

// Normalizes to what Inngest registers remotely: the event name (string or
// EventType), the if-expression, and the cron — nothing SDK-internal.
function triggersOf(fn: IntrospectedFn) {
  return (fn.opts.triggers ?? []).map((t) => {
    if (t.cron !== undefined) return { cron: t.cron };
    return {
      event: typeof t.event === "string" ? t.event : t.event?.name,
      ...(t.if === undefined ? {} : { if: t.if }),
    };
  });
}

let registry: Record<
  string,
  { safeParse: (value: unknown) => { success: boolean; error?: unknown } }
>;
let functions: IntrospectedFn[];

beforeAll(async () => {
  // ~/env and ~/server/db are the load-bearing mocks: the workers
  // value-import ~/server/db, whose module-scope neon() needs a real
  // DATABASE_URL; and ~/env validates at import outside SKIP_ENV_VALIDATION.
  // Everything else is import-safe — leads.module no longer constructs the
  // tRPC router (root.ts wires the adapter), so the workers' graph never
  // reaches ~/server/api/trpc / ~/server/auth/auth; "server-only" markers resolve to
  // the rstest alias stub and the per-domain *.schema.ts drizzle pgTable defs
  // (adr021 — there is no schema barrel) are side-effect-free.
  rs.doMock("~/env", () => ({ env: {} }));
  rs.doMock("~/server/db", () => ({ db: {} }));

  registry = (await import("~/server/inngest/events")).EVENT_REGISTRY;
  functions = (await import("~/server/inngest/functions"))
    .functions as unknown as IntrospectedFn[];
});

// The served-functions array is the registration surface Inngest sees; the
// barrel re-exports the same InngestFunction instances the worker modules do.
function fnById(id: string): IntrospectedFn {
  const fn = functions.find((f) => f.id() === id);
  if (!fn) throw new Error(`no served function with id "${id}"`);
  return fn;
}

describe("Inngest registry — golden contract", () => {
  test("EVENT_REGISTRY keys are exactly the 8 known event names", () => {
    // Pins the wire strings themselves — trigger assertions below only cover
    // the 5 names workers listen on; waitForEvent matches and send-only names
    // (engagement-created, followup-message-drafted, plan-paused) are equally
    // load-bearing external identifiers.
    expect(Object.keys(registry).sort()).toEqual([
      "hubspot.email.engagement-created",
      "hubspot.engagement-missed",
      "lead.captured",
      "lead.stage-changed",
      "lead.updated",
      "message.approval-requested",
      "nurture.followup-message-drafted",
      "nurture.plan-paused",
    ]);
  });

  test("served functions are exactly the 8 known ids", () => {
    expect(functions).toHaveLength(8);
    expect(functions.map((fn) => fn.id()).sort()).toEqual([
      "dispatch-email",
      "dispatch-imessage",
      "dispatch-sms",
      "lead-hubspot-sync",
      "nurture-plan-runner",
      "outbox-prune",
      "outbox-sweep",
      "reconcile-missed-engagement",
    ]);
  });

  test("outbox-sweep: hourly cron, defaults otherwise", () => {
    const sweep = fnById("outbox-sweep");
    expect(triggersOf(sweep)).toEqual([{ cron: "0 * * * *" }]);
    expect(sweep.opts.concurrency).toBeUndefined();
    expect(sweep.opts.retries).toBeUndefined();
    expect(sweep.opts.onFailure).toBeUndefined();
  });

  test("outbox-prune: daily 03:00 cron, defaults otherwise", () => {
    const prune = fnById("outbox-prune");
    expect(triggersOf(prune)).toEqual([{ cron: "0 3 * * *" }]);
    expect(prune.opts.concurrency).toBeUndefined();
    expect(prune.opts.retries).toBeUndefined();
    expect(prune.opts.onFailure).toBeUndefined();
  });

  test("lead-hubspot-sync: lead.captured + lead.updated, defaults otherwise", () => {
    const fanout = fnById("lead-hubspot-sync");
    expect(triggersOf(fanout)).toEqual([
      { event: "lead.captured" },
      { event: "lead.updated" },
    ]);
    expect(fanout.opts.concurrency).toBeUndefined();
    expect(fanout.opts.retries).toBeUndefined();
    expect(fanout.opts.onFailure).toBeUndefined();
  });

  test("nurture-plan-runner: lead.stage-changed, per-lead serialization, retries 8, onFailure pauses plan", () => {
    const nurture = fnById("nurture-plan-runner");
    expect(triggersOf(nurture)).toEqual([{ event: "lead.stage-changed" }]);
    expect(nurture.opts.concurrency).toEqual([
      { key: "event.data.leadId", limit: 1 },
    ]);
    expect(nurture.opts.retries).toBe(8);
    // Presence is the contract: exhausted retries must emit nurture.plan-paused.
    expect(typeof nurture.opts.onFailure).toBe("function");
  });

  test("dispatch-email: approval-requested gated to email, per-message serialization, retries 4", () => {
    const email = fnById("dispatch-email");
    expect(triggersOf(email)).toEqual([
      {
        event: "message.approval-requested",
        if: "event.data.channel == 'email'",
      },
    ]);
    expect(email.opts.concurrency).toEqual([
      { key: "event.data.messageId", limit: 1 },
    ]);
    expect(email.opts.retries).toBe(4);
    expect(email.opts.onFailure).toBeUndefined();
  });

  test("dispatch-sms: approval-requested gated to sms, per-message serialization, retries 4", () => {
    const sms = fnById("dispatch-sms");
    expect(triggersOf(sms)).toEqual([
      {
        event: "message.approval-requested",
        if: "event.data.channel == 'sms'",
      },
    ]);
    expect(sms.opts.concurrency).toEqual([
      { key: "event.data.messageId", limit: 1 },
    ]);
    expect(sms.opts.retries).toBe(4);
    expect(sms.opts.onFailure).toBeUndefined();
  });

  test("dispatch-imessage: approval-requested gated to imessage, per-message serialization, retries 0", () => {
    const imessage = fnById("dispatch-imessage");
    expect(triggersOf(imessage)).toEqual([
      {
        event: "message.approval-requested",
        if: "event.data.channel == 'imessage'",
      },
    ]);
    expect(imessage.opts.concurrency).toEqual([
      { key: "event.data.messageId", limit: 1 },
    ]);
    // 0 until ADR-001 is implemented — every run is a guaranteed failure.
    expect(imessage.opts.retries).toBe(0);
    expect(imessage.opts.onFailure).toBeUndefined();
  });

  test("reconcile-missed-engagement: engagement-missed, per-message serialization, retries 3", () => {
    const reconcile = fnById("reconcile-missed-engagement");
    expect(triggersOf(reconcile)).toEqual([
      { event: "hubspot.engagement-missed" },
    ]);
    expect(reconcile.opts.concurrency).toEqual([
      { key: "event.data.messageId", limit: 1 },
    ]);
    expect(reconcile.opts.retries).toBe(3);
    expect(reconcile.opts.onFailure).toBeUndefined();
  });
});

// Representative payloads copied verbatim (shape-for-shape) from each event's
// real emit site. Registry schemas are strict, so this pins the emit-site ↔
// schema contract from both sides: a key added at an emit site but not in the
// schema fails here, as does a schema key the emit site never sends becoming
// required. If a case fails, fix the drift at the emit site or schema — never
// by loosening the payload below.
const EMIT_SITE_PAYLOADS: Record<EventName, Record<string, unknown>> = {
  // leads.decide.ts decideCaptureFromHubspot — hubspotSync: false suppresses
  // the echo sync on HubSpot-origin ingest (decideCaptureLead omits the flag
  // entirely).
  "lead.captured": { leadId: "lead-1", userId: "user-1", hubspotSync: false },
  // leads.decide.ts decideUpdateLead
  "lead.updated": { leadId: "lead-1", userId: "user-1" },
  // leads.decide.ts stageChangedEvent — fromStage null on first capture
  "lead.stage-changed": {
    leadId: "lead-1",
    userId: "user-1",
    fromStage: null,
    toStage: "hot",
  },
  // messages router approve (email branch); correlationId doubles the row id
  "message.approval-requested": {
    messageId: "msg-1",
    correlationId: "msg-1",
    channel: "email",
    body: "Hi there",
    leadId: "lead-1",
  },
  // hubspot webhook route email.creation handler — the only pre-prod coverage
  // of this payload (its E2E path is HUBSPOT_WEBHOOK_ACTIVE-gated, prod-only).
  "hubspot.email.engagement-created": {
    correlationId: "msg-1",
    hubspotActivityId: "12345",
  },
  // dispatch-email emit-engagement-missed step (waitForEvent timeout branch)
  "hubspot.engagement-missed": {
    messageId: "msg-1",
    leadId: "lead-1",
    correlationId: "msg-1",
  },
  // nurture-plan-runner emit-drafted step
  "nurture.followup-message-drafted": { leadId: "lead-1", messageId: "msg-1" },
  // nurture-plan-runner onFailure handler
  "nurture.plan-paused": { leadId: "lead-1" },
};

describe("EVENT_REGISTRY — emit-site payload contract", () => {
  test("every registry event has an emit-site payload case", () => {
    expect(Object.keys(EMIT_SITE_PAYLOADS).sort()).toEqual(
      Object.keys(registry).sort(),
    );
  });

  for (const [name, payload] of Object.entries(EMIT_SITE_PAYLOADS)) {
    test(`${name}: real emit-site payload parses`, () => {
      const result = registry[name]!.safeParse(payload);
      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
    });
  }
});
