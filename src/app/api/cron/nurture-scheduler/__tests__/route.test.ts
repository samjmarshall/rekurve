import { beforeEach, describe, expect, rs, test } from "@rstest/core";

const CRON_SECRET = "test-secret-at-least-16-chars";

beforeEach(() => {
  rs.resetModules();

  rs.doMock("~/env", () => ({
    env: {
      CRON_SECRET,
      DATABASE_URL: "postgres://mock",
    },
  }));

  rs.doMock("~/server/db", () => ({ db: {} }));

  rs.doMock("~/server/nurture/scheduler", () => ({
    runSchedulerTick: rs.fn().mockResolvedValue({ drafted: 1, failed: 0 }),
  }));
});

async function getHandler() {
  const { GET } = await import("../route");
  return GET;
}

describe("GET /api/cron/nurture-scheduler", () => {
  test("returns 401 without Authorization header", async () => {
    const GET = await getHandler();
    const req = new Request("http://localhost/api/cron/nurture-scheduler");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  test("returns 401 with wrong bearer", async () => {
    const GET = await getHandler();
    const req = new Request("http://localhost/api/cron/nurture-scheduler", {
      headers: { Authorization: "Bearer wrong-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  test("returns 200 with correct bearer and calls runSchedulerTick", async () => {
    const GET = await getHandler();
    const { runSchedulerTick } = await import("~/server/nurture/scheduler");

    const req = new Request("http://localhost/api/cron/nurture-scheduler", {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { drafted: number; failed: number };
    expect(body).toEqual({ drafted: 1, failed: 0 });
    expect(runSchedulerTick).toHaveBeenCalled();
  });

  test("returns 200 with { drafted: 0, failed: 0 } when no sequences due", async () => {
    const { runSchedulerTick } = await import("~/server/nurture/scheduler");
    (runSchedulerTick as ReturnType<typeof rs.fn>).mockResolvedValue({
      drafted: 0,
      failed: 0,
    });

    const GET = await getHandler();
    const req = new Request("http://localhost/api/cron/nurture-scheduler", {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { drafted: number; failed: number };
    expect(body).toEqual({ drafted: 0, failed: 0 });
  });
});
