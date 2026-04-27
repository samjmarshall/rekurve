import { beforeEach, describe, expect, rs, test } from "@rstest/core";

let mockFindFirst: ReturnType<typeof rs.fn>;
let mockUpdateSet: ReturnType<typeof rs.fn>;
let mockUpdateWhere: ReturnType<typeof rs.fn>;
let mockUpdateReturning: ReturnType<typeof rs.fn>;
let mockAcquireTokenByRefreshToken: ReturnType<typeof rs.fn>;
let mockClientInit: ReturnType<typeof rs.fn>;

const TOKEN_ROW = {
  userId: "user-1",
  accessToken: "access-token-abc",
  refreshToken: "refresh-token-xyz",
  expiresAt: new Date(Date.now() + 3600_000), // 1 hour from now
  microsoftUserId: "ms-user-id",
  email: "consultant@example.com",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const MOCK_GRAPH_CLIENT = { api: rs.fn() };

beforeEach(() => {
  rs.resetModules();

  mockFindFirst = rs.fn();
  mockUpdateSet = rs.fn();
  mockUpdateWhere = rs.fn();
  mockUpdateReturning = rs.fn().mockResolvedValue([]);
  mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning });
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
  mockAcquireTokenByRefreshToken = rs.fn();
  mockClientInit = rs.fn().mockReturnValue(MOCK_GRAPH_CLIENT);

  rs.doMock("~/env", () => ({
    env: {
      MS_GRAPH_CLIENT_ID: "test-client-id",
      MS_GRAPH_CLIENT_SECRET: "test-client-secret",
      MS_GRAPH_REDIRECT_URI: "https://www.localhost/api/auth/ms-graph/callback",
    },
  }));

  rs.doMock("~/server/db", () => ({
    db: {
      query: {
        msGraphTokens: { findFirst: mockFindFirst },
      },
      update: rs.fn().mockReturnValue({ set: mockUpdateSet }),
    },
  }));

  rs.doMock("@azure/msal-node", () => ({
    ConfidentialClientApplication: class {
      acquireTokenByRefreshToken = mockAcquireTokenByRefreshToken;
    },
  }));

  rs.doMock("@microsoft/microsoft-graph-client", () => ({
    Client: { init: mockClientInit },
  }));
});

describe("graphClientForUser", () => {
  test("throws MsGraphNotConnectedError when no token row exists", async () => {
    mockFindFirst.mockResolvedValue(undefined);

    const { graphClientForUser, MsGraphNotConnectedError } = await import(
      "../client"
    );

    await expect(graphClientForUser("user-1")).rejects.toBeInstanceOf(
      MsGraphNotConnectedError,
    );
  });

  test("returns authenticated Graph client when token is valid", async () => {
    mockFindFirst.mockResolvedValue(TOKEN_ROW);

    const { graphClientForUser } = await import("../client");
    const client = await graphClientForUser("user-1");

    expect(mockClientInit).toHaveBeenCalledWith(
      expect.objectContaining({ authProvider: expect.any(Function) }),
    );
    expect(client).toBe(MOCK_GRAPH_CLIENT);
    expect(mockAcquireTokenByRefreshToken).not.toHaveBeenCalled();
  });

  test("auth provider passes access token to callback", async () => {
    mockFindFirst.mockResolvedValue(TOKEN_ROW);

    const { graphClientForUser } = await import("../client");
    await graphClientForUser("user-1");

    const { authProvider } = mockClientInit.mock.calls[0]![0] as {
      authProvider: (
        done: (err: Error | null, token: string | null) => void,
      ) => void;
    };

    await new Promise<void>((resolve) => {
      authProvider((_err, token) => {
        expect(token).toBe("access-token-abc");
        resolve();
      });
    });
  });

  test("refreshes token when within 60s of expiry", async () => {
    const nearExpiry = {
      ...TOKEN_ROW,
      expiresAt: new Date(Date.now() + 30_000),
    };
    mockFindFirst.mockResolvedValue(nearExpiry);
    mockAcquireTokenByRefreshToken.mockResolvedValue({
      accessToken: "new-access-token",
      expiresOn: new Date(Date.now() + 3600_000),
    });

    const { graphClientForUser } = await import("../client");
    await graphClientForUser("user-1");

    expect(mockAcquireTokenByRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({
        refreshToken: "refresh-token-xyz",
        scopes: expect.arrayContaining(["Mail.Send"]),
      }),
    );
  });

  test("persists new accessToken and expiresAt after refresh", async () => {
    const nearExpiry = {
      ...TOKEN_ROW,
      expiresAt: new Date(Date.now() + 30_000),
    };
    mockFindFirst.mockResolvedValue(nearExpiry);
    const newExpiry = new Date(Date.now() + 3600_000);
    mockAcquireTokenByRefreshToken.mockResolvedValue({
      accessToken: "new-access-token",
      expiresOn: newExpiry,
    });

    const { graphClientForUser } = await import("../client");
    await graphClientForUser("user-1");

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: "new-access-token",
        expiresAt: newExpiry,
      }),
    );
  });

  test("throws MsGraphNotConnectedError when refresh returns null", async () => {
    const nearExpiry = {
      ...TOKEN_ROW,
      expiresAt: new Date(Date.now() + 30_000),
    };
    mockFindFirst.mockResolvedValue(nearExpiry);
    mockAcquireTokenByRefreshToken.mockResolvedValue(null);

    const { graphClientForUser, MsGraphNotConnectedError } = await import(
      "../client"
    );

    await expect(graphClientForUser("user-1")).rejects.toBeInstanceOf(
      MsGraphNotConnectedError,
    );
  });
});
