import { expect, test } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { cleanupVerificationByIdentifier } from "../utils/auth-helper";

// Serial: each case mutates Upstash rate-limit counters keyed by email.
// Desktop-only: viewport doesn't affect rate-limit behaviour; running on all
// three projects would triple the Upstash command count for no coverage gain.
test.describe.configure({ mode: "serial" });

const OTP_SEND = "/api/auth/email-otp/send-verification-otp";
const OTP_VERIFY = "/api/auth/sign-in/email-otp";

function uniqueEmail(): string {
  return `otp-rl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
}

test.describe("OTP send rate limiting — canary", () => {
  const collectedEmails: string[] = [];

  test.afterAll(async () => {
    await cleanupVerificationByIdentifier(collectedEmails);
  });

  test("case 1: email key fires on the 4th send within the window", async ({
    request,
  }) => {
    const email = uniqueEmail();
    collectedEmails.push(email);

    const body = { email, type: "sign-in" };

    const r1 = await request.post(OTP_SEND, { data: body });
    expect(r1.status()).toBe(200);

    const r2 = await request.post(OTP_SEND, { data: body });
    expect(r2.status()).toBe(200);

    const r3 = await request.post(OTP_SEND, { data: body });
    expect(r3.status()).toBe(200);

    const r4 = await request.post(OTP_SEND, { data: body });
    expect(r4.status()).toBe(429);

    const json = await r4.json();
    expect(typeof json.message).toBe("string");
    expect(r4.headers()["retry-after"]).toBeDefined();
  });

  test("case 2: fresh email is unaffected (no regression)", async ({
    request,
  }) => {
    const email = uniqueEmail();
    collectedEmails.push(email);

    const r = await request.post(OTP_SEND, {
      data: { email, type: "sign-in" },
    });
    expect(r.status()).toBe(200);
  });

  test("case 3: 429 message surfaces in /login UI (validates APIError flat-body fix)", async ({
    page,
  }) => {
    const email = uniqueEmail();
    collectedEmails.push(email);

    // Exhaust 3 allowed sends via direct API calls
    for (let i = 0; i < 3; i++) {
      await page.request.post(OTP_SEND, {
        data: { email, type: "sign-in" },
      });
    }

    // 4th send via the UI — must show the rate-limit message, not the generic fallback
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.fillEmail(email);
    await loginPage.submitEmail();

    await loginPage.expectError("Too many requests. Please try again later.");
  });

  test("case 4: S2 loop bound — attacker capped at ≤3 OTPs × 3 guesses per window", async ({
    request,
  }) => {
    const email = uniqueEmail();
    collectedEmails.push(email);

    // Send #1 — succeeds, OTP dispatched
    const s1 = await request.post(OTP_SEND, {
      data: { email, type: "sign-in" },
    });
    expect(s1.status()).toBe(200);

    // 3 wrong-OTP verify attempts exhaust allowedAttempts for this OTP.
    // Assert the verify path itself is not rate-limited (no 429).
    for (let i = 0; i < 3; i++) {
      const v = await request.post(OTP_VERIFY, {
        data: { email, otp: "000000" },
      });
      expect(v.status()).not.toBe(429);
    }

    // Sends #2 and #3 still succeed (2nd and 3rd of 3 allowed per window)
    const s2 = await request.post(OTP_SEND, {
      data: { email, type: "sign-in" },
    });
    expect(s2.status()).toBe(200);

    const s3 = await request.post(OTP_SEND, {
      data: { email, type: "sign-in" },
    });
    expect(s3.status()).toBe(200);

    // Send #4 — blocked; attacker cannot obtain a 4th OTP in this window
    const s4 = await request.post(OTP_SEND, {
      data: { email, type: "sign-in" },
    });
    expect(s4.status()).toBe(429);
  });
});
