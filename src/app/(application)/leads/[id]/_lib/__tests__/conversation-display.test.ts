import { describe, expect, test } from "@rstest/core";
import {
  channelIcon,
  directionLabel,
  wasEdited,
} from "../conversation-display";

describe("directionLabel", () => {
  test("outbound → Sent", () => {
    expect(directionLabel("outbound")).toBe("Sent");
  });

  test("inbound → Received", () => {
    expect(directionLabel("inbound")).toBe("Received");
  });
});

describe("channelIcon", () => {
  test("sms → MessageSquare", () => {
    expect(channelIcon("sms")).toBe("MessageSquare");
  });

  test("email → Mail", () => {
    expect(channelIcon("email")).toBe("Mail");
  });
});

describe("wasEdited", () => {
  test("null originalBody → false", () => {
    expect(wasEdited({ originalBody: null, body: "Sent body" })).toBe(false);
  });

  test("originalBody equals body → false (approved without edit)", () => {
    expect(wasEdited({ originalBody: "Same text", body: "Same text" })).toBe(
      false,
    );
  });

  test("originalBody differs from body → true", () => {
    expect(
      wasEdited({ originalBody: "Original draft", body: "Edited sent body" }),
    ).toBe(true);
  });
});
