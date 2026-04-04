import { describe, expect, test } from "@rstest/core";
import { isValidAuMobile, leadFormSchema } from "../schema";

describe("isValidAuMobile", () => {
  test("accepts standard AU mobile format", () => {
    expect(isValidAuMobile("0412345678")).toBe(true);
  });

  test("accepts format with spaces", () => {
    expect(isValidAuMobile("0412 345 678")).toBe(true);
  });

  test("accepts international format", () => {
    expect(isValidAuMobile("+61412345678")).toBe(true);
  });

  test("accepts format with dashes", () => {
    expect(isValidAuMobile("0412-345-678")).toBe(true);
  });

  test("rejects landline number", () => {
    expect(isValidAuMobile("0732001234")).toBe(false);
  });

  test("rejects too-short number", () => {
    expect(isValidAuMobile("041234567")).toBe(false);
  });

  test("rejects non-AU number", () => {
    expect(isValidAuMobile("+1555123456")).toBe(false);
  });
});

describe("leadFormSchema", () => {
  test("accepts valid data with AU phone", () => {
    const result = leadFormSchema.safeParse({
      firstName: "John",
      lastName: "Smith",
      phone: "0412 345 678",
    });
    expect(result.success).toBe(true);
  });

  test("rejects invalid AU phone", () => {
    const result = leadFormSchema.safeParse({
      firstName: "John",
      lastName: "Smith",
      phone: "555-1234",
    });
    expect(result.success).toBe(false);
  });

  test("accepts empty phone (optional field)", () => {
    const result = leadFormSchema.safeParse({
      firstName: "John",
      lastName: "Smith",
    });
    expect(result.success).toBe(true);
  });

  test("rejects undefined firstName with custom message", () => {
    const result = leadFormSchema.safeParse({
      firstName: undefined,
      lastName: "Smith",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const firstNameError = result.error.issues.find(
        (i) => i.path[0] === "firstName",
      );
      expect(firstNameError?.message).toBe("First name is required");
    }
  });

  test("rejects undefined lastName with custom message", () => {
    const result = leadFormSchema.safeParse({
      firstName: "John",
      lastName: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const lastNameError = result.error.issues.find(
        (i) => i.path[0] === "lastName",
      );
      expect(lastNameError?.message).toBe("Last name is required");
    }
  });
});
