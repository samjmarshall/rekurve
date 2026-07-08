import { rs } from "@rstest/core";

import type { createOutboxHelpers } from "../core";

type OutboxDeps = Parameters<typeof createOutboxHelpers>[0];

export type OutboxInsertValues = {
  id: string;
  eventName: string;
  payload: unknown;
};

export type MockOutboxQuery = {
  __isQuery: true;
  values: OutboxInsertValues;
};

/**
 * Fake-db scaffold shared by commit.test.ts and outbox.test.ts. Each
 * `db.insert(outbox).values(...)` call returns a DISTINCT query object that
 * captures its values arg (recorded in `queries` in call order), so tests can
 * assert batch statement ORDER and event→row-id pairing rather than matching
 * one shared sentinel. `update().set().where()` resolves undefined for
 * sendPostCommit's processedAt stamp; `batch` resolves []. The assembled `db`
 * goes straight into `createOutboxHelpers({ db, inngest })` — no rs.doMock.
 */
export function makeOutboxDbMocks() {
  const queries: MockOutboxQuery[] = [];
  const values = rs.fn().mockImplementation((v: OutboxInsertValues) => {
    const query: MockOutboxQuery = { __isQuery: true, values: v };
    queries.push(query);
    return query;
  });
  const insert = rs.fn().mockReturnValue({ values });
  const where = rs.fn().mockResolvedValue(undefined);
  const set = rs.fn().mockReturnValue({ where });
  const update = rs.fn().mockReturnValue({ set });
  const batch = rs.fn().mockResolvedValue([]);
  const db = { insert, update, batch } as unknown as OutboxDeps["db"];
  return { queries, values, insert, where, set, update, batch, db };
}

/** Fake Inngest client for `createOutboxHelpers`; `send` resolves by default. */
export function makeFakeInngest() {
  const send = rs.fn().mockResolvedValue(undefined);
  const inngest = { send } as unknown as OutboxDeps["inngest"];
  return { send, inngest };
}
