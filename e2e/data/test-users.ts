/** Identifiable test email domain for PostHog filtering */
export const TEST_EMAIL_DOMAIN = "@test.rekurve.dev";
export const TEST_NAME_PREFIX = "Playwright";

export interface TestUser {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
  companySize: string;
  industry: string;
  location: string;
  timeline: string;
  currentMrr: string;
  challenges: string[];
  goals: string;
}

/** Generate unique test user with timestamp */
export function createTestUser(overrides?: Partial<TestUser>): TestUser {
  const timestamp = Date.now();
  const uniqueId = timestamp.toString(36); // Shorter unique string

  return {
    email: `${TEST_NAME_PREFIX.toLowerCase()}-${uniqueId}${TEST_EMAIL_DOMAIN}`,
    firstName: TEST_NAME_PREFIX,
    lastName: `User ${uniqueId}`,
    phone: "+61400000000",
    company: `Test Company ${uniqueId}`,
    companySize: "11-20 employees",
    industry: "Technology",
    location: "Brisbane",
    timeline: "In 1-3 months",
    currentMrr: "$10K - $50K",
    challenges: ["Quote generation is too manual and time-consuming"],
    goals: "Automate lead research and improve conversion rates",
    ...overrides,
  };
}

/** Create user for abandonment tests (partial data) */
export function createAbandonmentUser(overrides?: Partial<TestUser>): TestUser {
  return createTestUser({
    email: `abandon-${Date.now().toString(36)}${TEST_EMAIL_DOMAIN}`,
    ...overrides,
  });
}

/** Create user for identity flow tests */
export function createIdentityTestUser(
  variant: "first" | "changed",
  overrides?: Partial<TestUser>,
): TestUser {
  const timestamp = Date.now().toString(36);
  const prefix = variant === "first" ? "identity" : "identity-changed";

  return createTestUser({
    email: `${prefix}-${timestamp}${TEST_EMAIL_DOMAIN}`,
    ...overrides,
  });
}
