import { describe, expect, test } from "@rstest/core";
import {
  MAX_BODY,
  validateEditBody,
} from "~/app/(application)/dashboard/_lib/edit-validation";

describe("validateEditBody", () => {
  test("flags whitespace-only body as empty and invalid", () => {
    const result = validateEditBody("   \n\t  ");
    expect(result.empty).toBe(true);
    expect(result.tooLong).toBe(false);
    expect(result.valid).toBe(false);
  });

  test("flags body exceeding 1600 chars as too long", () => {
    const result = validateEditBody("x".repeat(MAX_BODY + 1));
    expect(result.tooLong).toBe(true);
    expect(result.valid).toBe(false);
  });

  test("body at exactly the cap is valid", () => {
    const result = validateEditBody("x".repeat(MAX_BODY));
    expect(result.tooLong).toBe(false);
    expect(result.valid).toBe(true);
  });

  test("non-empty body under cap is valid", () => {
    const result = validateEditBody("Hey, following up on the Springfield lot");
    expect(result).toEqual({ empty: false, tooLong: false, valid: true });
  });
});
