import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { getSession } from "~/lib/session";
import { db } from "~/server/db";
import { msGraphTokens } from "~/server/db/schema";
import { graphClientForUser } from "~/server/ms-graph";

interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

interface MicrosoftMeResponse {
  id: string;
  mail?: string;
  userPrincipalName?: string;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error ?? !code) {
    return NextResponse.json(
      { error: error ?? "Missing authorization code" },
      { status: 400 },
    );
  }

  // Exchange the authorization code for tokens directly — acquireTokenByCode
  // does not expose the refresh_token in its result type (MSAL stores it
  // internally), so we call the token endpoint ourselves to get both tokens.
  const tokenRes = await fetch(
    "https://login.microsoftonline.com/organizations/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.MS_GRAPH_CLIENT_ID,
        client_secret: env.MS_GRAPH_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: env.MS_GRAPH_REDIRECT_URI,
        scope: "Mail.Send offline_access User.Read",
      }),
    },
  );

  const tokens = (await tokenRes.json()) as MicrosoftTokenResponse;

  if (tokens.error ?? !tokens.access_token) {
    return NextResponse.json(
      { error: tokens.error_description ?? "Token exchange failed" },
      { status: 400 },
    );
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await db
    .insert(msGraphTokens)
    .values({
      userId: session.user.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      microsoftUserId: "",
      email: "",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: msGraphTokens.userId,
      set: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        updatedAt: new Date(),
      },
    });

  // Enrich with Microsoft user identity from /me (best-effort)
  try {
    const graphClient = await graphClientForUser(session.user.id);
    const me = (await graphClient.api("/me").get()) as MicrosoftMeResponse;
    const microsoftEmail = me.mail ?? me.userPrincipalName ?? "";

    await db
      .update(msGraphTokens)
      .set({ microsoftUserId: me.id, email: microsoftEmail })
      .where(eq(msGraphTokens.userId, session.user.id));
  } catch {
    // Non-fatal — token row is upserted; /me enrichment is best-effort
  }

  redirect("/dashboard?ms_connected=1");
}
