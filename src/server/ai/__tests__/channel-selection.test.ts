import { describe, expect, test } from "@rstest/core";

import { selectChannel } from "../channel-selection";
import { makeLead } from "./fixtures";

describe("selectChannel", () => {
  test("hot + email + phone → email", () => {
    const lead = makeLead({
      leadStage: "hot",
      email: "jane@example.com",
      phone: "+61400000000",
    });
    expect(selectChannel(lead)).toBe("email");
  });

  test("hot + phone only → sms", () => {
    const lead = makeLead({
      leadStage: "hot",
      phone: "+61400000000",
    });
    expect(selectChannel(lead)).toBe("sms");
  });

  test("warm + email + phone → sms (SMS preference for non-hot)", () => {
    const lead = makeLead({
      leadStage: "warm",
      email: "jane@example.com",
      phone: "+61400000000",
    });
    expect(selectChannel(lead)).toBe("sms");
  });

  test("nurture + phone only → sms", () => {
    const lead = makeLead({
      leadStage: "nurture",
      phone: "+61400000000",
    });
    expect(selectChannel(lead)).toBe("sms");
  });

  test("nurture + email only → email (fallback when no phone)", () => {
    const lead = makeLead({
      leadStage: "nurture",
      email: "jane@example.com",
    });
    expect(selectChannel(lead)).toBe("email");
  });

  test("no phone + no email → throws", () => {
    const lead = makeLead({ leadStage: "warm" });
    expect(() => selectChannel(lead)).toThrow(/no phone or email/);
  });
});
