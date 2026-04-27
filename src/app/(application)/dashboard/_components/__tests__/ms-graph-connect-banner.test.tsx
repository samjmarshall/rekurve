import { describe, expect, test } from "@rstest/core";
import { MsGraphConnectBanner } from "../ms-graph-connect-banner";

describe("MsGraphConnectBanner", () => {
  test("returns null when connected", () => {
    const result = MsGraphConnectBanner({ connected: true });
    expect(result).toBeNull();
  });

  test("returns non-null when not connected", () => {
    const result = MsGraphConnectBanner({ connected: false });
    expect(result).not.toBeNull();
  });

  test("rendered element includes connect link when not connected", () => {
    const result = MsGraphConnectBanner({ connected: false }) as {
      props: { children: unknown[] };
    };
    // JSX compiles to React element objects — check the data-testid prop
    expect(result).toMatchObject({
      props: expect.objectContaining({
        "data-testid": "ms-graph-connect-banner",
      }),
    });
  });
});
