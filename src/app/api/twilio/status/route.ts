import { NextResponse } from "next/server";
import { validateRequest } from "twilio";
import { env } from "~/env";
import { messagingModule } from "~/server/messaging/messaging.module";

export async function POST(request: Request) {
  const signature = request.headers.get("x-twilio-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 403 });
  }

  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = String(value);
  });

  if (!env.TWILIO_AUTH_TOKEN) {
    return NextResponse.json(
      { error: "Twilio not configured" },
      { status: 403 },
    );
  }

  const isValid = validateRequest(
    env.TWILIO_AUTH_TOKEN,
    signature,
    request.url,
    params,
  );

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const { MessageSid: messageSid, MessageStatus: messageStatus } = params;

  try {
    if (!messageSid || !messageStatus) {
      console.log(
        "[Twilio Status] Missing MessageSid or MessageStatus in callback",
      );
      return NextResponse.json({ received: true });
    }

    await messagingModule.service.recordDeliveryStatus({
      sid: messageSid,
      status: messageStatus,
    });
  } catch (error) {
    console.error("[Twilio Status] Error updating delivery status:", error);
  }

  return NextResponse.json({ received: true });
}
