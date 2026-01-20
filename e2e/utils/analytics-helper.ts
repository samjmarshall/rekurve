import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import pako from 'pako';

interface CapturedEvent {
  event: string;
  properties: Record<string, unknown>;
  timestamp: number;
}

export class AnalyticsHelper {
  private page: Page;
  private capturedEvents: CapturedEvent[] = [];
  private isListening = false;

  constructor(page: Page) {
    this.page = page;
  }

  /** Decode gzip-js compressed PostHog payload */
  private decodePayload(data: string): unknown {
    try {
      // First try parsing as plain JSON (some requests aren't compressed)
      return JSON.parse(data);
    } catch {
      // Try base64 + gzip decompression
      try {
        const binaryData = Buffer.from(data, 'base64');
        const decompressed = pako.ungzip(binaryData, { to: 'string' });
        return JSON.parse(decompressed);
      } catch {
        // Try URL-encoded base64
        try {
          const decoded = decodeURIComponent(data);
          const binaryData = Buffer.from(decoded, 'base64');
          const decompressed = pako.ungzip(binaryData, { to: 'string' });
          return JSON.parse(decompressed);
        } catch {
          return null;
        }
      }
    }
  }

  /** Extract events from PostHog request body */
  private extractEventsFromBody(postData: string | null): CapturedEvent[] {
    const events: CapturedEvent[] = [];

    try {
      if (!postData) return events;

      // Handle form-encoded data (data=...)
      let payload: string = postData;
      if (postData.startsWith('data=')) {
        payload = postData.slice(5); // Remove 'data=' prefix
      }

      const decoded = this.decodePayload(payload);
      if (!decoded) return events;

      // PostHog batches events
      const eventList = Array.isArray(decoded)
        ? decoded
        : (decoded as Record<string, unknown>)?.batch
          ? ((decoded as Record<string, unknown>).batch as unknown[])
          : [decoded];

      for (const event of eventList) {
        const e = event as Record<string, unknown>;
        if (e?.event) {
          events.push({
            event: e.event as string,
            properties: (e.properties as Record<string, unknown>) ?? {},
            timestamp: Date.now(),
          });
        }
      }
    } catch {
      // Silently ignore parse errors
    }

    return events;
  }

  /** Start intercepting PostHog capture requests */
  async startCapturing(): Promise<void> {
    if (this.isListening) return;

    this.capturedEvents = [];
    this.isListening = true;

    // Use 'request' event listener to catch all requests including sendBeacon
    this.page.on('request', (request) => {
      const url = request.url();

      // Only process PostHog requests
      if (!url.includes('posthog')) return;

      const method = request.method();

      // Match event capture endpoints
      if (method === 'POST' && (url.includes('/e') || url.includes('/capture') || url.includes('/batch'))) {
        const postData = request.postData();
        const events = this.extractEventsFromBody(postData);
        if (events.length > 0) {
          this.capturedEvents.push(...events);
        }
      }
    });
  }

  /** Stop capturing */
  async stopCapturing(): Promise<void> {
    // Event listeners are cleaned up when page closes
    this.isListening = false;
  }

  /** Clear captured events (useful between test actions) */
  clearEvents(): void {
    this.capturedEvents = [];
  }

  /** Get all captured events */
  getEvents(): CapturedEvent[] {
    return [...this.capturedEvents];
  }

  /** Get events of a specific type */
  getEventsByName(eventName: string): CapturedEvent[] {
    return this.capturedEvents.filter((e) => e.event === eventName);
  }

  /** Wait for an event to be captured (with timeout) */
  async waitForEvent(eventName: string, timeoutMs = 5000): Promise<CapturedEvent | null> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const event = this.capturedEvents.find((e) => e.event === eventName);
      if (event) return event;
      // Use requestAnimationFrame-based delay instead of hard timeout
      await this.page.evaluate(() => new Promise(r => requestAnimationFrame(r)));
    }
    return null;
  }

  /** Begin fluent assertion chain */
  expectEvent(eventName: string): EventAssertion {
    return new EventAssertion(eventName, this.capturedEvents);
  }

  /** Assert no events of a type were fired */
  expectNoEvent(eventName: string): void {
    const found = this.capturedEvents.filter((e) => e.event === eventName);
    expect(
      found,
      `Expected no '${eventName}' events, but found ${found.length}`
    ).toHaveLength(0);
  }

  /** Debug: print all captured events */
  debugPrintEvents(): void {
    console.log('Captured events:', JSON.stringify(this.capturedEvents, null, 2));
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

  constructor(eventName: string, events: CapturedEvent[]) {
    this.eventName = eventName;
    this.events = events;
  }

  /** Assert exact property value */
  withProperty(key: string, value: unknown): this {
    this.propertyMatchers.push({
      key,
      matcher: (v) => v === value,
      description: `${key} = ${JSON.stringify(value)}`,
    });
    return this;
  }

  /** Assert property matches regex */
  withPropertyMatching(key: string, pattern: RegExp): this {
    this.propertyMatchers.push({
      key,
      matcher: (v) => typeof v === 'string' && pattern.test(v),
      description: `${key} matches ${pattern}`,
    });
    return this;
  }

  /** Assert property exists (any value) */
  withPropertyPresent(key: string): this {
    this.propertyMatchers.push({
      key,
      matcher: (v) => v !== undefined && v !== null,
      description: `${key} is present`,
    });
    return this;
  }

  /** Assert property is one of the allowed values */
  withPropertyOneOf(key: string, allowedValues: unknown[]): this {
    this.propertyMatchers.push({
      key,
      matcher: (v) => allowedValues.includes(v),
      description: `${key} is one of [${allowedValues.join(', ')}]`,
    });
    return this;
  }

  /** Execute the assertion */
  toBeFired(): void {
    const matchingEvents = this.events.filter((e) => e.event === this.eventName);

    expect(
      matchingEvents.length,
      `Expected '${this.eventName}' event to be fired, but it wasn't. ` +
        `Captured events: [${this.events.map((e) => e.event).join(', ')}]`
    ).toBeGreaterThan(0);

    if (this.propertyMatchers.length === 0) return;

    // Find an event that matches ALL property conditions
    const fullyMatchingEvent = matchingEvents.find((event) =>
      this.propertyMatchers.every(({ key, matcher }) =>
        matcher(event.properties[key])
      )
    );

    if (!fullyMatchingEvent) {
      const conditions = this.propertyMatchers.map((m) => m.description).join(', ');
      const actualProps = matchingEvents
        .map((e) => JSON.stringify(e.properties))
        .join('\n');

      throw new Error(
        `Expected '${this.eventName}' with [${conditions}], but no matching event found.\n` +
          `Actual '${this.eventName}' events:\n${actualProps}`
      );
    }
  }

  /** Assert event was fired exactly N times */
  toBeFiredTimes(count: number): void {
    const matchingEvents = this.events.filter((e) => {
      if (e.event !== this.eventName) return false;
      if (this.propertyMatchers.length === 0) return true;
      return this.propertyMatchers.every(({ key, matcher }) =>
        matcher(e.properties[key])
      );
    });

    expect(matchingEvents).toHaveLength(count);
  }
}
