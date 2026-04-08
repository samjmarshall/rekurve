import { describe, expect, test } from "@rstest/core";
import { quickCaptureFormSchema } from "../schema";

describe("quickCaptureFormSchema", () => {
  test("accepts minimal valid input with AU mobile", () => {
    const result = quickCaptureFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      phone: "0412345678",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.leadSource).toBe("other");
  });

  test("rejects missing first name", () => {
    const result = quickCaptureFormSchema.safeParse({
      lastName: "Doe",
      phone: "0412345678",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing phone", () => {
    const result = quickCaptureFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
    });
    expect(result.success).toBe(false);
  });

  test("rejects non-AU phone format", () => {
    const result = quickCaptureFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      phone: "555-1234",
    });
    expect(result.success).toBe(false);
  });

  test("accepts phone with spaces and international prefix", () => {
    const result = quickCaptureFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      phone: "+61 412 345 678",
    });
    expect(result.success).toBe(true);
  });

  test("accepts optional notes and lead source override", () => {
    const result = quickCaptureFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      phone: "0412345678",
      notes: "Met at BBQ",
      leadSource: "referral",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe("Met at BBQ");
      expect(result.data.leadSource).toBe("referral");
    }
  });
});
