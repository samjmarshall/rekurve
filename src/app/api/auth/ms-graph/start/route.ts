import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { env } from "~/env";
import { getSession } from "~/lib/session";
import { getMsalClient } from "~/server/ms-graph";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const msalClient = getMsalClient();
  const authUrl = await msalClient.getAuthCodeUrl({
    scopes: ["Mail.Send", "offline_access", "User.Read"],
    redirectUri: env.MS_GRAPH_REDIRECT_URI,
    responseMode: "query",
    prompt: "select_account",
  });

  redirect(authUrl);
}
