import { beforeEach, describe, expect, rs, test } from "@rstest/core";

import { draftMessageOutputSchema } from "../schema";
import { makeLead } from "./fixtures";

type ParseFn = ReturnType<typeof rs.fn>;

let parseFn: ParseFn;

beforeEach(() => {
  rs.resetModules();

  rs.doMock("~/env", () => ({
    env: { ANTHROPIC_API_KEY: "test-key" },
  }));

  parseFn = rs.fn();

  rs.doMock("@anthropic-ai/sdk", () => {
    class Anthropic {
      messages = { parse: parseFn };
    }
    return { default: Anthropic };
  });

  rs.doMock("@anthropic-ai/sdk/helpers/zod", () => ({
    zodOutputFormat: (schema: unknown) => ({ __zod: schema }),
  }));
});

async function loadDraftMessage() {
  const mod = await import("../draft-message");
  return mod.draftMessage;
}

const CANNED_EMAIL_PARSED = {
  subject: "Quick check-in about Springfield Rise",
  body: "Hi Jane, wanted to follow up on your Springfield Rise interest — would love to chat about what's available. — Sam",
  reasoning:
    "Hot lead with email preference; references preferred estate and invites next conversation.",
};

const CANNED_SMS_PARSED = {
  subject: "This should be stripped",
  body: "Hi Jane, touching base — any thoughts on land in Ripley Valley? Happy to share a few options that suit your budget.",
  reasoning: "Warm lead + SMS — short check-in, references top gap (land).",
};

describe("draftMessage — channel + priority + output shape", () => {
  test("hot lead with email → channel email, subject non-null, priority >= 80", async () => {
    parseFn.mockResolvedValue({ parsed_output: CANNED_EMAIL_PARSED });
    const draftMessage = await loadDraftMessage();

    const lead = makeLead({
      leadStage: "hot",
      email: "jane@example.com",
      phone: "+61400000000",
    });

    const result = await draftMessage({ lead });

    expect(result.channel).toBe("email");
    expect(result.subject).toBe(CANNED_EMAIL_PARSED.subject);
    expect(result.body).toBe(CANNED_EMAIL_PARSED.body);
    expect(result.aiReasoning).toBe(CANNED_EMAIL_PARSED.reasoning);
    expect(result.priority).toBeGreaterThanOrEqual(80);
    expect(result.aiReasoning.length).toBeGreaterThan(0);
  });

  test("warm lead with phone only → channel sms, subject null even if Claude hallucinated one", async () => {
    parseFn.mockResolvedValue({ parsed_output: CANNED_SMS_PARSED });
    const draftMessage = await loadDraftMessage();

    const lead = makeLead({ leadStage: "warm", phone: "+61400000000" });

    const result = await draftMessage({ lead });

    expect(result.channel).toBe("sms");
    expect(result.subject).toBeNull();
    expect(result.body).toBe(CANNED_SMS_PARSED.body);
    expect(result.priority).toBe(50);
  });

  test("unqualified lead with phone → priority 10 (base) or 20 (overdue)", async () => {
    parseFn.mockResolvedValue({ parsed_output: CANNED_SMS_PARSED });
    const draftMessage = await loadDraftMessage();

    const lead = makeLead({ leadStage: "unqualified", phone: "+61400000000" });

    const result = await draftMessage({ lead });

    expect(result.priority).toBeLessThanOrEqual(25);
    expect(result.priority).toBeGreaterThanOrEqual(10);
  });

  test("output passes draftMessageOutputSchema self-validation", async () => {
    parseFn.mockResolvedValue({ parsed_output: CANNED_EMAIL_PARSED });
    const draftMessage = await loadDraftMessage();

    const lead = makeLead({
      leadStage: "hot",
      email: "jane@example.com",
      phone: "+61400000000",
    });

    const result = await draftMessage({ lead });

    expect(() => draftMessageOutputSchema.parse(result)).not.toThrow();
  });
});

describe("draftMessage — null scoreMetadata branch", () => {
  test("scoreMetadata null still calls Claude with fallback prompt (no throw)", async () => {
    parseFn.mockResolvedValue({ parsed_output: CANNED_SMS_PARSED });
    const draftMessage = await loadDraftMessage();

    const lead = makeLead({
      leadStage: "warm",
      phone: "+61400000000",
      scoreMetadata: null,
    });

    const result = await draftMessage({ lead });
    expect(result.channel).toBe("sms");
    expect(parseFn).toHaveBeenCalledTimes(1);

    const call = parseFn.mock.calls[0]?.[0];
    const userContent = (call as { messages: { content: string }[] })
      .messages[0]?.content;
    expect(userContent).toContain("No score metadata");
  });
});

describe("draftMessage — error paths", () => {
  test("Claude returns parsed_output: null → throws", async () => {
    parseFn.mockResolvedValue({ parsed_output: null });
    const draftMessage = await loadDraftMessage();

    const lead = makeLead({ leadStage: "warm", phone: "+61400000000" });

    await expect(draftMessage({ lead })).rejects.toThrow(
      /no structured output/,
    );
  });

  test("Claude throws API error → propagates (no retry, no swallow)", async () => {
    parseFn.mockRejectedValue(new Error("anthropic 500"));
    const draftMessage = await loadDraftMessage();

    const lead = makeLead({ leadStage: "warm", phone: "+61400000000" });

    await expect(draftMessage({ lead })).rejects.toThrow("anthropic 500");
    expect(parseFn).toHaveBeenCalledTimes(1);
  });

  test("lead with neither phone nor email → throws before calling Claude", async () => {
    const draftMessage = await loadDraftMessage();

    const lead = makeLead({ leadStage: "warm" });

    await expect(draftMessage({ lead })).rejects.toThrow(/no phone or email/);
    expect(parseFn).not.toHaveBeenCalled();
  });
});

describe("draftMessage — Claude call shape", () => {
  test("passes cache_control ephemeral on system block", async () => {
    parseFn.mockResolvedValue({ parsed_output: CANNED_SMS_PARSED });
    const draftMessage = await loadDraftMessage();

    await draftMessage({
      lead: makeLead({ leadStage: "warm", phone: "+61400000000" }),
    });

    const call = parseFn.mock.calls[0]?.[0] as {
      system: { type: string; cache_control: { type: string } }[];
      model: string;
    };
    expect(call.system[0]?.cache_control.type).toBe("ephemeral");
    expect(call.model).toBe("claude-sonnet-4-6");
  });
});
