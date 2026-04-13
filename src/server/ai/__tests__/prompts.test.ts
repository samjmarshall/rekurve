import { describe, expect, test } from "@rstest/core";

import type { ScoreMetadata } from "~/server/scoring";
import { buildUserPrompt } from "../prompts";
import { makeLead } from "./fixtures";

const fullMetadata: ScoreMetadata = {
  score: 62,
  breakdown: {
    land: { score: 15, maxScore: 30, reasoning: "no land yet" },
    finance: { score: 15, maxScore: 15, reasoning: "seen broker" },
    timeline: { score: 12, maxScore: 20, reasoning: "3-6 months" },
    budget: { score: 10, maxScore: 10, reasoning: "$650K" },
    propertyType: { score: 10, maxScore: 10, reasoning: "FHB" },
    engagement: { score: 0, maxScore: 15, reasoning: "no conversations yet" },
  },
  gaps: [
    {
      field: "hasLand",
      impact: "high",
      description: "No land secured — biggest blocker.",
    },
  ],
  nextQuestion: "Are you looking at land in any specific estates?",
  scoredAt: "2026-04-13T00:00:00Z",
};

describe("buildUserPrompt", () => {
  test("includes lead name, stage, channel, and days since last contact", () => {
    const lead = makeLead({
      firstName: "Alex",
      lastName: "Nguyen",
      leadStage: "warm",
    });
    const prompt = buildUserPrompt({
      lead,
      channel: "sms",
      daysSinceLastContact: 3,
    });
    expect(prompt).toContain("Alex Nguyen");
    expect(prompt).toContain("Stage: warm");
    expect(prompt).toContain("Channel: SMS");
    expect(prompt).toContain("Days since last contact: 3");
  });

  test("uses 'never contacted' when daysSinceLastContact is null", () => {
    const prompt = buildUserPrompt({
      lead: makeLead(),
      channel: "sms",
      daysSinceLastContact: null,
    });
    expect(prompt).toContain("never contacted");
  });

  test("includes top gap and next question when scoreMetadata present", () => {
    const lead = makeLead({ scoreMetadata: fullMetadata });
    const prompt = buildUserPrompt({
      lead,
      channel: "sms",
      daysSinceLastContact: 1,
    });
    expect(prompt).toContain("Score: 62/100");
    expect(prompt).toContain("Top qualification gap: hasLand (high)");
    expect(prompt).toContain("No land secured");
    expect(prompt).toContain("Recommended next question: Are you looking");
  });

  test("emits fallback line when scoreMetadata is null", () => {
    const lead = makeLead({ scoreMetadata: null });
    const prompt = buildUserPrompt({
      lead,
      channel: "sms",
      daysSinceLastContact: 1,
    });
    expect(prompt).toContain("No score metadata");
    expect(prompt).not.toContain("Score:");
    expect(prompt).not.toContain("Top qualification gap");
  });

  test("email channel instruction mentions subject line", () => {
    const prompt = buildUserPrompt({
      lead: makeLead(),
      channel: "email",
      daysSinceLastContact: 1,
    });
    expect(prompt).toContain("Include a subject line");
  });

  test("sms channel instruction mentions character limit", () => {
    const prompt = buildUserPrompt({
      lead: makeLead(),
      channel: "sms",
      daysSinceLastContact: 1,
    });
    expect(prompt).toContain("under 320 characters");
    expect(prompt).not.toContain("subject line");
  });

  test("includes preferredEstates when present", () => {
    const lead = makeLead({
      preferredEstates: ["Springfield Rise", "Ripley Valley"],
    });
    const prompt = buildUserPrompt({
      lead,
      channel: "sms",
      daysSinceLastContact: 1,
    });
    expect(prompt).toContain(
      "Preferred estates: Springfield Rise, Ripley Valley",
    );
  });

  test("includes notes when present", () => {
    const lead = makeLead({ notes: "Wants to build in 6 months." });
    const prompt = buildUserPrompt({
      lead,
      channel: "sms",
      daysSinceLastContact: 1,
    });
    expect(prompt).toContain("Notes: Wants to build in 6 months.");
  });

  test("omits estates line when empty array", () => {
    const lead = makeLead({ preferredEstates: [] });
    const prompt = buildUserPrompt({
      lead,
      channel: "sms",
      daysSinceLastContact: 1,
    });
    expect(prompt).not.toContain("Preferred estates:");
  });

  test("handles scoreMetadata with empty gaps array", () => {
    const lead = makeLead({
      scoreMetadata: { ...fullMetadata, gaps: [] },
    });
    const prompt = buildUserPrompt({
      lead,
      channel: "sms",
      daysSinceLastContact: 1,
    });
    expect(prompt).toContain("Score: 62/100");
    expect(prompt).not.toContain("Top qualification gap");
  });
});
