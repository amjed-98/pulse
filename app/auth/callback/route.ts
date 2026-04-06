import { NextResponse } from "next/server";

import { logServerError } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function sanitizeNextPath(next: string | null) {
  if (!next) {
    return "/dashboard";
  }

  if (!next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }

  return next;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = sanitizeNextPath(url.searchParams.get("next"));

  try {
    if (code) {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        const referenceId = await logServerError({
          source: "auth.callback",
          message: "Failed to exchange auth callback code for session.",
          error,
          context: {
            next,
          },
        });

        const destination = new URL("/login", url.origin);
        destination.searchParams.set("error", "auth_callback_failed");
        destination.searchParams.set("ref", referenceId);
        return NextResponse.redirect(destination);
      }
    }

    return NextResponse.redirect(new URL(next, url.origin));
  } catch (error) {
    const referenceId = await logServerError({
      source: "auth.callback",
      message: "Unexpected failure in auth callback route.",
      error,
      context: {
        next,
      },
    });

    const destination = new URL("/login", url.origin);
    destination.searchParams.set("error", "auth_callback_failed");
    destination.searchParams.set("ref", referenceId);
    return NextResponse.redirect(destination);
  }
}
