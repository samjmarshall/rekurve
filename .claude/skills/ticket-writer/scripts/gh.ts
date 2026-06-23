// Impure boundary: the only module that shells out to `gh`. Every payload is
// Zod-parsed at the seam so a GitHub API shape change fails loudly with a path,
// not a silent `undefined`. Pure logic lives in `rules.ts`.

import { execSync } from "node:child_process";
import { z } from "zod";
import {
	RawBoardSchema,
	RawIssueSchema,
	type RawIssue,
	type RawProjectItem,
} from "./rules";

const REPO = "samjmarshall/ai-insurance-claims";
const OWNER = "samjmarshall";
const PROJECT = "4";

// Expected project field display names (lowercased). A board rename silently
// drops the JSON key → `assertExpectedFields` turns that into a hard failure
// instead of a validator that quietly passes everything.
const REQUIRED_FIELD_NAMES = ["status", "start date", "target date"];

/** Operational failure (gh missing/unauth, API shape drift, board rename). Exit 2. */
export class GhError extends Error {}

function sh(cmd: string): string {
	try {
		return execSync(cmd, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
	} catch (err) {
		throw new GhError(`command failed: ${cmd}\n${(err as Error).message}`);
	}
}

function parseJson(raw: string, cmd: string): unknown {
	try {
		return JSON.parse(raw);
	} catch {
		throw new GhError(`could not parse JSON from: ${cmd}`);
	}
}

/** Fetch one issue. Guards against PR/issue number collisions via the URL. */
export function fetchIssue(n: number): RawIssue {
	const cmd = `gh issue view ${n} --repo ${REPO} --json number,title,body,labels,milestone,url`;
	const parsed = RawIssueSchema.safeParse(parseJson(sh(cmd), cmd));
	if (!parsed.success)
		throw new GhError(`issue #${n}: unexpected gh shape — ${parsed.error.message}`);
	if (!/\/issues\/\d+$/.test(parsed.data.url))
		throw new GhError(`#${n} is not an issue (got ${parsed.data.url}) — PR number?`);
	return parsed.data;
}

/** Fetch the whole board once into a number→item map. Guards against pagination truncation. */
export function fetchBoard(): Map<number, RawProjectItem> {
	const cmd = `gh project item-list ${PROJECT} --owner ${OWNER} --format json --limit 200`;
	const parsed = RawBoardSchema.safeParse(parseJson(sh(cmd), cmd));
	if (!parsed.success)
		throw new GhError(`board: unexpected gh shape — ${parsed.error.message}`);
	if (parsed.data.items.length < parsed.data.totalCount)
		throw new GhError(
			`board truncated: read ${parsed.data.items.length}/${parsed.data.totalCount} items — raise --limit`,
		);
	const map = new Map<number, RawProjectItem>();
	for (const item of parsed.data.items) map.set(item.content.number, item);
	return map;
}

/** Child issue numbers of an epic, in board order. */
export function fetchSubIssues(n: number): number[] {
	const cmd = `gh api /repos/${REPO}/issues/${n}/sub_issues --jq 'map(.number)'`;
	return z.array(z.number()).parse(parseJson(sh(cmd), cmd));
}

const FieldListSchema = z.object({
	fields: z.array(z.object({ name: z.string() })),
});

/** Rename guard: fail hard if an expected project field name is gone. */
export function assertExpectedFields(): void {
	const cmd = `gh project field-list ${PROJECT} --owner ${OWNER} --format json`;
	const parsed = FieldListSchema.safeParse(parseJson(sh(cmd), cmd));
	if (!parsed.success)
		throw new GhError(`field-list: unexpected gh shape — ${parsed.error.message}`);
	const names = new Set(parsed.data.fields.map((f) => f.name.toLowerCase()));
	for (const required of REQUIRED_FIELD_NAMES)
		if (!names.has(required))
			throw new GhError(
				`project field "${required}" not found — renamed? The validator reads fields by name.`,
			);
}
