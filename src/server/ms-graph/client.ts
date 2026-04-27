import { ConfidentialClientApplication } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import { eq } from "drizzle-orm";
import { env } from "~/env";
import { db } from "~/server/db";
import { msGraphTokens } from "~/server/db/schema";

export class MsGraphNotConnectedError extends Error {
  constructor() {
    super("Microsoft account not connected");
    this.name = "MsGraphNotConnectedError";
  }
}

const GRAPH_SCOPES = ["Mail.Send", "offline_access", "User.Read"];
const REFRESH_SKEW_MS = 60_000;

export function getMsalClient(): ConfidentialClientApplication {
  return new ConfidentialClientApplication({
    auth: {
      clientId: env.MS_GRAPH_CLIENT_ID,
      clientSecret: env.MS_GRAPH_CLIENT_SECRET,
      authority: "https://login.microsoftonline.com/organizations",
    },
  });
}

export async function graphClientForUser(userId: string): Promise<Client> {
  const row = await db.query.msGraphTokens.findFirst({
    where: eq(msGraphTokens.userId, userId),
  });

  if (!row) {
    throw new MsGraphNotConnectedError();
  }

  let { accessToken } = row;

  if (row.expiresAt < new Date(Date.now() + REFRESH_SKEW_MS)) {
    const msalClient = getMsalClient();
    const result = await msalClient.acquireTokenByRefreshToken({
      refreshToken: row.refreshToken,
      scopes: GRAPH_SCOPES,
    });

    if (!result) {
      throw new MsGraphNotConnectedError();
    }

    accessToken = result.accessToken;
    const newExpiresAt = result.expiresOn ?? new Date(Date.now() + 3600_000);

    await db
      .update(msGraphTokens)
      .set({ accessToken, expiresAt: newExpiresAt, updatedAt: new Date() })
      .where(eq(msGraphTokens.userId, userId));
  }

  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}
