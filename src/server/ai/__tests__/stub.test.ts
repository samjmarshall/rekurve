import { afterEach, describe, expect, rs, test } from "@rstest/core";
import { resolveDraftFn } from "../stub";
import { makeLead } from "./fixtures";

describe("resolveDraftFn", () => {
  afterEach(() => {
    rs.restoreAllMocks();
  });

  test("returns undefined when x-ai-stub header is absent", () => {
    const req = new Request("http://localhost/api/cron/nurture-scheduler");
    expect(resolveDraftFn(req)).toBeUndefined();
  });

  test("returns undefined for x-ai-stub: 0", () => {
    const req = new Request("http://localhost/api/cron/nurture-scheduler", {
      headers: { "x-ai-stub": "0" },
    });
    expect(resolveDraftFn(req)).toBeUndefined();
  });

  test("returns undefined for empty x-ai-stub header", () => {
    const req = new Request("http://localhost/api/cron/nurture-scheduler", {
      headers: { "x-ai-stub": "" },
    });
    expect(resolveDraftFn(req)).toBeUndefined();
  });

  describe("when x-ai-stub: 1", () => {
    function makeStubReq() {
      return new Request("http://localhost/api/cron/nurture-scheduler", {
        headers: { "x-ai-stub": "1" },
      });
    }

    test("returns a function", () => {
      expect(resolveDraftFn(makeStubReq())).toBeTypeOf("function");
    });

    test("output channel matches selectChannel(lead)", async () => {
      const fn = resolveDraftFn(makeStubReq())!;
      const lead = makeLead({ phone: "0412345678" });
      const output = await fn({ lead });
      expect(output.channel).toBe("sms");
    });

    test("output priority matches computePriority(lead)", async () => {
      const fn = resolveDraftFn(makeStubReq())!;
      const lead = makeLead({ leadStage: "warm", phone: "0412345678" });
      const output = await fn({ lead });
      expect(output.priority).toBe(50);
    });

    test("body starts with '[ai-stub] body for ' and contains lead.id", async () => {
      const fn = resolveDraftFn(makeStubReq())!;
      const lead = makeLead({ phone: "0412345678" });
      const output = await fn({ lead });
      expect(output.body).toMatch(/^\[ai-stub\] body for /);
      expect(output.body).toContain(lead.id);
    });

    test("subject is null for an SMS-selected lead", async () => {
      const fn = resolveDraftFn(makeStubReq())!;
      const lead = makeLead({ phone: "0412345678" });
      const output = await fn({ lead });
      expect(output.subject).toBeNull();
    });

    test("subject is '[ai-stub] subject' for an email-selected lead", async () => {
      const fn = resolveDraftFn(makeStubReq())!;
      const lead = makeLead({
        leadStage: "hot",
        email: "test@example.com",
        phone: null,
      });
      const output = await fn({ lead });
      expect(output.subject).toBe("[ai-stub] subject");
    });

    test("logs to console.info with [ai-stub] prefix on invocation", async () => {
      const spy = rs.spyOn(console, "info").mockImplementation(() => undefined);
      const fn = resolveDraftFn(makeStubReq())!;
      const lead = makeLead({ phone: "0412345678" });
      await fn({ lead });
      expect(spy).toHaveBeenCalledWith(expect.stringMatching(/^\[ai-stub\]/));
    });
  });
});
