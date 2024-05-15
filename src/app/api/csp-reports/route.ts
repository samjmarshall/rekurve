/* eslint-disable import/no-unused-modules */
import "source-map-support/register"

import { type NextRequest, NextResponse } from "next/server"
import logger from "~/server/logger"

export async function POST(request: NextRequest): Promise<NextResponse> {
  logger.error({
    request: "POST /api/csp-report",
    message: "CSP violation",
    data: (await request.json()) as unknown,
  })

  return new NextResponse()
}
