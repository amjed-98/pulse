import { NextResponse } from "next/server";

import { getEnvSummary } from "@/lib/env";
import { logServerError } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = getEnvSummary();
  const adminClient = await createSupabaseAdminClient();
  const checks = {
    env: "ok" as "ok" | "degraded" | "error",
    database: "degraded" as "ok" | "degraded" | "error",
  };

  try {
    if (adminClient) {
      const { error } = await adminClient.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
      checks.database = error ? "error" : "ok";
    }

    const status =
      checks.env === "error" || checks.database === "error"
        ? "error"
        : checks.env === "degraded" || checks.database === "degraded"
          ? "degraded"
          : "ok";

    return NextResponse.json(
      {
        status,
        checks,
        environment: env,
        timestamp: new Date().toISOString(),
        notes: adminClient
          ? []
          : ["Database probe skipped because SUPABASE_SERVICE_ROLE_KEY is not configured in this environment."],
      },
      {
        status: status === "error" ? 503 : 200,
      },
    );
  } catch (error) {
    const referenceId = await logServerError({
      source: "health.GET",
      message: "Health check failed unexpectedly.",
      error,
    });

    return NextResponse.json(
      {
        status: "error",
        checks: {
          env: "ok",
          database: "error",
        },
        referenceId,
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
      },
    );
  }
}
