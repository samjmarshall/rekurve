import { rs } from "@rstest/core";

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
 * Mock-db scaffold shared by commit.test.ts and outbox.test.ts. Each
 * `db.insert(outbox).values(...)` call returns a DISTINCT query object that
 * captures its values arg (recorded in `queries` in call order), so tests can
 * assert batch statement ORDER and event→row-id pairing rather than matching
 * one shared sentinel. `update().set().where()` resolves undefined for
 * sendPostCommit's processedAt stamp. Tests wire these into `rs.doMock` on
 * ~/server/db themselves — the two suites mock different subsets.
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
  return { queries, values, insert, where, set, update };
}
