import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logServerEvent } from "@/lib/logger";

interface RecordAnalyticsEventInput {
  userId: string;
  eventName: string;
  value?: number;
}

export async function recordAnalyticsEvent(input: RecordAnalyticsEventInput) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("analytics_events").insert({
    user_id: input.userId,
    event_name: input.eventName,
    value: input.value ?? 1,
  });

  if (error) {
    await logServerEvent({
      level: "warn",
      source: "analytics.recordAnalyticsEvent",
      message: "Analytics event insert failed.",
      context: {
        userId: input.userId,
        eventName: input.eventName,
        value: input.value ?? 1,
        error: error.message,
      },
    });
  }
}
