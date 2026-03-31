import { createHmac, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { env } from "~/env";
import { db } from "~/server/db";
import { session, user } from "~/server/db/schema/auth";

const DEV_EMAIL = "design-review@dev.local";
const DEV_NAME = "Design Reviewer";

function notFound() {
  return NextResponse.json({}, { status: 404 });
}

function signCookieValue(value: string): string {
  const signature = createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(value)
    .digest("base64");
  return `${value}.${signature}`;
}

export async function POST(request: Request) {
  if (env.NODE_ENV !== "development") return notFound();
  if (request.headers.get("X-Dev-Session") !== "true") return notFound();

  // Find or create the dev user
  let devUser = await db.query.user.findFirst({
    where: eq(user.email, DEV_EMAIL),
  });

  if (!devUser) {
    const id = randomUUID();
    const [inserted] = await db
      .insert(user)
      .values({
        id,
        name: DEV_NAME,
        email: DEV_EMAIL,
        emailVerified: true,
      })
      .returning();
    devUser = inserted;
  }

  // Create a new session
  const sessionId = randomUUID();
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.insert(session).values({
    id: sessionId,
    token,
    expiresAt,
    userId: devUser!.id,
    ipAddress: "127.0.0.1",
    userAgent: "design-review-agent",
  });

  return NextResponse.json({
    cookie: {
      name: "better-auth.session_token",
      value: signCookieValue(token),
      domain: "localhost",
      path: "/",
    },
    user: { id: devUser!.id, email: devUser!.email },
    expiresAt: expiresAt.toISOString(),
  });
}

export async function DELETE(request: Request) {
  if (env.NODE_ENV !== "development") return notFound();
  if (request.headers.get("X-Dev-Session") !== "true") return notFound();

  const body = (await request.json()) as { userId?: string };
  const userId = body.userId;

  if (userId) {
    await db.delete(user).where(eq(user.id, userId));
  } else {
    await db.delete(user).where(eq(user.email, DEV_EMAIL));
  }

  return NextResponse.json({ deleted: true });
}
