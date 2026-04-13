import type { ConsoleMessage, Page } from "@playwright/test";
import { expect } from "@playwright/test";

interface CapturedEvent {
  event: string;
  properties: Record<string, unknown>;
}

const CAPTURE_PREFIX = "[E2E:captured]";

/**
 * AnalyticsHelper accumulates PostHog captures on the Playwright process
 * side by listening for `console.info("[E2E:captured]...")` messages that
 * `src/instrumentation-client.ts` emits from a `before_send` hook in E2E
 * mode.
 *
 * Storing events in Node rather than on `window` is important: several
 * tests capture an event and then immediately `router.push(...)` (e.g.
 * `login_success` → `/dashboard`). Navigation throws away the document and
 * any window-scoped state along with it, so a browser-side bucket can't
 * be read afterwards. The Node-side array survives navigations because the
 * page console listener outlives individual documents.
 */
export class AnalyticsHelper {
  private page: Page;
  private capturedEvents: CapturedEvent[] = [];
  private listener: ((msg: ConsoleMessage) => void) | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  /** Attach a page console listener that records E2E captures. */
  async startCapturing(): Promise<void> {
    if (this.listener) return;
    this.capturedEvents = [];
    this.listener = (msg) => {
      const text = msg.text();
      if (!text.startsWith(CAPTURE_PREFIX)) return;
      try {
        const json = text.slice(CAPTURE_PREFIX.length);
        const parsed = JSON.parse(json) as CapturedEvent;
        this.capturedEvents.push({
          event: parsed.event,
          properties: parsed.properties ?? {},
        });
      } catch {
        // Malformed payload — ignore.
      }
    };
    this.page.on("console", this.listener);
  }

  /** Detach the console listener. */
  async stopCapturing(): Promise<void> {
    if (this.listener) {
      this.page.off("console", this.listener);
      this.listener = null;
    }
  }

  /** Clear captured events (useful between test actions). */
  clearEvents(): void {
    this.capturedEvents = [];
  }

  /** Get all captured events. */
  getEvents(): CapturedEvent[] {
    return [...this.capturedEvents];
  }

  /** Get events of a specific type. */
  getEventsByName(eventName: string): CapturedEvent[] {
    return this.capturedEvents.filter((e) => e.event === eventName);
  }

  /** Wait for an event to be captured (with timeout). Polls every 50ms. */
  async waitForEvent(
    eventName: string,
    timeoutMs = 5000,
  ): Promise<CapturedEvent | null> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const found = this.capturedEvents.find((e) => e.event === eventName);
      if (found) return found;
      await new Promise((r) => setTimeout(r, 50));
    }
    return null;
  }

  /** Begin fluent assertion chain. */
  expectEvent(eventName: string): EventAssertion {
    return new EventAssertion(eventName, this.capturedEvents);
  }

  /** Assert no events of a type were fired at the moment of the call. */
  expectNoEvent(eventName: string): void {
    const found = this.capturedEvents.filter((e) => e.event === eventName);
    expect(
      found,
      `Expected no '${eventName}' events, but found ${found.length}`,
    ).toHaveLength(0);
  }

  /** Debug: print all captured events. */
  debugPrintEvents(): void {
    console.log(
      "Captured events:",
      JSON.stringify(this.capturedEvents, null, 2),
    );
  }
}

class EventAssertion {
  private eventName: string;
  private events: CapturedEvent[];
  private propertyMatchers: Array<{
    key: string;
    matcher: (value: unknown) => boolean;
    description: string;
  }> = [];

  /**
   * `events` is the same array reference held by AnalyticsHelper, so new
   * captures become visible on each poll iteration without any rework.
   */
  constructor(eventName: string, events: CapturedEvent[]) {
    this.eventName = eventName;
    this.events = events;
  }

  /** Assert exact property value. */
  withProperty(key: string, value: unknown): this {
    this.propertyMatchers.push({
      key,
      matcher: (v) => v === value,
      description: `${key} = ${JSON.stringify(value)}`,
    });
    return this;
  }

  /** Assert property matches regex. */
  withPropertyMatching(key: string, pattern: RegExp): this {
    this.propertyMatchers.push({
      key,
      matcher: (v) => typeof v === "string" && pattern.test(v),
      description: `${key} matches ${pattern}`,
    });
    return this;
  }

  /** Assert property exists (any value). */
  withPropertyPresent(key: string): this {
    this.propertyMatchers.push({
      key,
      matcher: (v) => v !== undefined && v !== null,
      description: `${key} is present`,
    });
    return this;
  }

  /** Assert property is one of the allowed values. */
  withPropertyOneOf(key: string, allowedValues: unknown[]): this {
    this.propertyMatchers.push({
      key,
      matcher: (v) => allowedValues.includes(v),
      description: `${key} is one of [${allowedValues.join(", ")}]`,
    });
    return this;
  }

  /** Execute the assertion — polls until the event arrives or timeout. */
  async toBeFired(timeoutMs = 5000): Promise<void> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const matching = this.events.filter((e) => e.event === this.eventName);
      if (matching.length > 0) {
        if (this.propertyMatchers.length === 0) return;
        const fullyMatching = matching.find((event) =>
          this.propertyMatchers.every(({ key, matcher }) =>
            matcher(event.properties[key]),
          ),
        );
        if (fullyMatching) return;
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    // Timeout — raise a rich error with the captured-state at the end.
    const matching = this.events.filter((e) => e.event === this.eventName);
    expect(
      matching.length,
      `Expected '${this.eventName}' event to be fired within ${timeoutMs}ms, but it wasn't. ` +
        `Captured events: [${this.events.map((e) => e.event).join(", ")}]`,
    ).toBeGreaterThan(0);

    const conditions = this.propertyMatchers
      .map((m) => m.description)
      .join(", ");
    const actualProps = matching
      .map((e) => JSON.stringify(e.properties))
      .join("\n");
    throw new Error(
      `Expected '${this.eventName}' with [${conditions}] within ${timeoutMs}ms, but no matching event found.\n` +
        `Actual '${this.eventName}' events:\n${actualProps}`,
    );
  }

  /** Assert event was fired exactly N times — polls until count reached or timeout. */
  async toBeFiredTimes(count: number, timeoutMs = 5000): Promise<void> {
    const startedAt = Date.now();
    const filterMatching = () =>
      this.events.filter((e) => {
        if (e.event !== this.eventName) return false;
        if (this.propertyMatchers.length === 0) return true;
        return this.propertyMatchers.every(({ key, matcher }) =>
          matcher(e.properties[key]),
        );
      });

    while (Date.now() - startedAt < timeoutMs) {
      const matching = filterMatching();
      if (matching.length === count) return;
      if (matching.length > count) break; // Fail fast — we've overshot
      await new Promise((r) => setTimeout(r, 50));
    }

    expect(filterMatching()).toHaveLength(count);
  }
}
