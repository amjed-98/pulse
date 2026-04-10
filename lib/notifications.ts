import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, NotificationType } from "@/lib/types";

interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  targetPath?: string | null;
}

export async function createNotification(input: CreateNotificationInput) {
  const supabase = await createSupabaseServerClient();

  await supabase.from("notifications").insert({
    user_id: input.userId,
    type: input.type ?? "info",
    title: input.title,
    message: input.message,
    target_path: input.targetPath ?? null,
  } satisfies Database["public"]["Tables"]["notifications"]["Insert"]);
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
  if (inputs.length === 0) {
    return;
  }

  const supabase = await createSupabaseServerClient();

  await supabase.from("notifications").insert(
    inputs.map(
      (input) =>
        ({
          user_id: input.userId,
          type: input.type ?? "info",
          title: input.title,
          message: input.message,
          target_path: input.targetPath ?? null,
        }) satisfies Database["public"]["Tables"]["notifications"]["Insert"],
    ),
  );
}
