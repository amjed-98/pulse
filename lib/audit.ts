import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/types";

interface CreateAuditLogInput {
  actorId: string;
  title: string;
  eventType: Database["public"]["Tables"]["audit_logs"]["Insert"]["event_type"];
  description?: string | null;
  projectId?: string | null;
  metadata?: Json;
}

export async function createAuditLog(input: CreateAuditLogInput) {
  const supabase = await createSupabaseServerClient();

  await supabase.from("audit_logs").insert({
    actor_id: input.actorId,
    title: input.title,
    description: input.description ?? null,
    event_type: input.eventType,
    project_id: input.projectId ?? null,
    metadata: input.metadata ?? {},
  });
}
