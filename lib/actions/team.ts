"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAnalyticsEvent } from "@/lib/analytics";
import { createAuditLog } from "@/lib/audit";
import {
  buildBillingGatePayload,
  buildPlanLimitPayload,
  getBillingGateMessage,
  getWorkspaceBillingSummary,
  isBillingStateActive,
} from "@/lib/billing";
import { toActionErrorState } from "@/lib/logger";
import { createNotification, createNotifications } from "@/lib/notifications";
import { requireAdminAccess } from "@/lib/permissions";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const inviteSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  role: z.enum(["admin", "member", "viewer"]),
});

const roleSchema = z.object({
  role: z.enum(["admin", "member", "viewer"]),
});

const removeMemberSchema = z.object({
  confirmation: z.literal("REMOVE", {
    errorMap: () => ({
      message: "Type REMOVE to confirm member deletion.",
    }),
  }),
});

function mapErrors(error: z.ZodError): ActionState {
  return {
    success: false,
    message: "Please correct the highlighted fields.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

export async function inviteMember(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const parsed = inviteSchema.safeParse({
      email: formData.get("email"),
      role: formData.get("role") ?? "member",
    });

    if (!parsed.success) {
      return mapErrors(parsed.error);
    }

    const access = await requireAdminAccess();
    const billing = await getWorkspaceBillingSummary(access.userId);

    if (!isBillingStateActive(billing.billing.status)) {
      return {
        success: false,
        message: getBillingGateMessage("team_invites", billing.billing.status),
        payload: buildBillingGatePayload({
          feature: "team_invites",
          status: billing.billing.status,
          currentPlan: billing.billing.plan,
        }),
      };
    }

    if (billing.usage.membersUsed >= billing.plan.limits.members) {
      return {
        success: false,
        message: `The ${billing.plan.name} plan supports up to ${billing.plan.limits.members} members. Upgrade to invite more teammates.`,
        payload: buildPlanLimitPayload({
          resource: "members",
          currentPlan: billing.billing.plan,
          used: billing.usage.membersUsed,
          limit: billing.plan.limits.members,
        }),
      };
    }

    const inviteRateLimit = await enforceRateLimit({
      scope: "team.invite",
      limit: 8,
      windowMs: 10 * 60 * 1000,
      key: access.userId,
    });

    if (!inviteRateLimit.allowed) {
      return {
        success: false,
        message: "Invite sending is temporarily throttled. Try again shortly.",
      };
    }

    const adminClient = await createSupabaseAdminClient();
    const supabase = await createSupabaseServerClient();

    if (!adminClient) {
      return {
        success: false,
        message: "Set SUPABASE_SERVICE_ROLE_KEY to send team invites.",
      };
    }

    const { error: inviteRecordError } = await supabase.from("workspace_invites").upsert(
      {
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role,
        invited_by: access.userId,
        status: "pending",
        accepted_at: null,
      },
      {
        onConflict: "email",
      },
    );

    if (inviteRecordError) {
      return toActionErrorState({
        source: "team.inviteMember",
        message: "Invite record upsert failed.",
        userMessage: "Could not prepare the invite right now.",
        error: inviteRecordError,
        context: {
          invitedEmail: parsed.data.email,
          invitedRole: parsed.data.role,
          userId: access.userId,
        },
      });
    }

    const { error } = await adminClient.auth.admin.inviteUserByEmail(parsed.data.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
      data: {
        full_name: parsed.data.email.split("@")[0],
        role: parsed.data.role,
      },
    });

    if (error) {
      return toActionErrorState({
        source: "team.inviteMember",
        message: "Invite failed via Supabase admin client.",
        userMessage: "Could not send the invite right now.",
        error,
        context: {
          invitedEmail: parsed.data.email,
          invitedRole: parsed.data.role,
          userId: access.userId,
        },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      eventType: "team.invited",
      title: `Invited ${parsed.data.email}`,
      description: `A workspace invitation email was sent with the ${parsed.data.role} role.`,
      metadata: {
        email: parsed.data.email,
        role: parsed.data.role,
      },
    });
    await recordAnalyticsEvent({
      userId: access.userId,
      eventName: "team_invited",
      value: 1,
    });
    await createNotification({
      userId: access.userId,
      type: "team",
      title: "Invite sent",
      message: `${parsed.data.email} was invited as ${parsed.data.role}.`,
      targetPath: "/team",
    });

    revalidatePath("/team");
    revalidatePath("/dashboard");
    return { success: true, message: `Invite sent to ${parsed.data.email}.` };
  } catch (error) {
    return toActionErrorState({
      source: "team.inviteMember",
      message: "Unexpected failure while inviting team member.",
      userMessage: "Could not send the invite right now.",
      error,
      context: {
        invitedEmail: formData.get("email"),
        invitedRole: formData.get("role"),
      },
    });
  }
}

export async function updateMemberRole(
  userId: string,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = roleSchema.safeParse({
      role: formData.get("role"),
    });

    if (!parsed.success) {
      return mapErrors(parsed.error);
    }

    const supabase = await createSupabaseServerClient();
    const access = await requireAdminAccess();
    const roleRateLimit = await enforceRateLimit({
      scope: "team.update-role",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      key: access.userId,
    });

    if (!roleRateLimit.allowed) {
      return {
        success: false,
        message: "Role changes are temporarily throttled. Try again shortly.",
      };
    }

    const { data: member, error: memberError } = await supabase
      .from("profiles")
      .select("id,full_name,email,role")
      .eq("id", userId)
      .maybeSingle();

    if (memberError) {
      return toActionErrorState({
        source: "team.updateMemberRole",
        message: "Member lookup failed before role update.",
        userMessage: "Could not change the member role right now.",
        error: memberError,
        context: {
          targetUserId: userId,
          nextRole: parsed.data.role,
          userId: access.userId,
        },
      });
    }

    if (!member) {
      return { success: false, message: "Team member not found." };
    }

    if (member.id === access.userId && parsed.data.role !== "admin") {
      return { success: false, message: "You cannot demote your own admin account." };
    }

    if (member.role === parsed.data.role) {
      return { success: true, message: "Member role is already up to date." };
    }

    const { error } = await supabase.from("profiles").update({ role: parsed.data.role }).eq("id", userId);

    if (error) {
      return toActionErrorState({
        source: "team.updateMemberRole",
        message: "Profile role update failed during mutation.",
        userMessage: "Could not change the member role right now.",
        error,
        context: {
          targetUserId: userId,
          previousRole: member.role,
          nextRole: parsed.data.role,
          userId: access.userId,
        },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      eventType: "team.role_changed",
      title: `Updated ${member.full_name ?? member.email ?? "team member"} role`,
      description: `Role changed from ${member.role} to ${parsed.data.role}.`,
      metadata: {
        targetUserId: member.id,
        previousRole: member.role,
        nextRole: parsed.data.role,
      },
    });
    await recordAnalyticsEvent({
      userId: access.userId,
      eventName: "team_role_changed",
      value: 1,
    });
    await createNotifications([
      {
        userId: access.userId,
        type: "team",
        title: "Member role updated",
        message: `${member.full_name ?? member.email ?? "A team member"} is now ${parsed.data.role}.`,
        targetPath: "/team",
      },
      ...(member.id !== access.userId
        ? [
            {
              userId: member.id,
              type: "team" as const,
              title: "Your role changed",
              message: `Your workspace role is now ${parsed.data.role}.`,
              targetPath: "/team",
            },
          ]
        : []),
    ]);

    revalidatePath("/team");
    revalidatePath("/dashboard");
    return { success: true, message: "Member role updated." };
  } catch (error) {
    return toActionErrorState({
      source: "team.updateMemberRole",
      message: "Unexpected failure while updating member role.",
      userMessage: "Could not change the member role right now.",
      error,
      context: {
        targetUserId: userId,
      },
    });
  }
}

export async function revokeInvite(inviteId: string): Promise<ActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireAdminAccess();
    const revokeRateLimit = await enforceRateLimit({
      scope: "team.revoke-invite",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      key: access.userId,
    });

    if (!revokeRateLimit.allowed) {
      return {
        success: false,
        message: "Invite revocation is temporarily throttled. Try again shortly.",
      };
    }

    const { data: invite, error: inviteError } = await supabase
      .from("workspace_invites")
      .select("id,email,role,status")
      .eq("id", inviteId)
      .maybeSingle();

    if (inviteError) {
      return toActionErrorState({
        source: "team.revokeInvite",
        message: "Invite lookup failed before revoke.",
        userMessage: "Could not revoke the invite right now.",
        error: inviteError,
        context: {
          inviteId,
          userId: access.userId,
        },
      });
    }

    if (!invite) {
      return { success: false, message: "Invite not found." };
    }

    const { error } = await supabase.from("workspace_invites").update({ status: "revoked" }).eq("id", inviteId);

    if (error) {
      return toActionErrorState({
        source: "team.revokeInvite",
        message: "Invite revoke failed during mutation.",
        userMessage: "Could not revoke the invite right now.",
        error,
        context: {
          inviteId,
          email: invite.email,
          userId: access.userId,
        },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      eventType: "team.invite_revoked",
      title: `Revoked invite for ${invite.email}`,
      description: `Pending ${invite.role} invitation was revoked before acceptance.`,
      metadata: {
        inviteId: invite.id,
        email: invite.email,
        role: invite.role,
      },
    });
    await recordAnalyticsEvent({
      userId: access.userId,
      eventName: "team_invite_revoked",
      value: 1,
    });

    revalidatePath("/team");
    return { success: true, message: "Invite revoked." };
  } catch (error) {
    return toActionErrorState({
      source: "team.revokeInvite",
      message: "Unexpected failure while revoking invite.",
      userMessage: "Could not revoke the invite right now.",
      error,
      context: {
        inviteId,
      },
    });
  }
}

export async function removeMember(userId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const parsed = removeMemberSchema.safeParse({
      confirmation: formData.get("confirmation"),
    });

    if (!parsed.success) {
      return mapErrors(parsed.error);
    }

    const supabase = await createSupabaseServerClient();
    const access = await requireAdminAccess();
    const removeRateLimit = await enforceRateLimit({
      scope: "team.remove-member",
      limit: 5,
      windowMs: 15 * 60 * 1000,
      key: access.userId,
    });

    if (!removeRateLimit.allowed) {
      return {
        success: false,
        message: "Member removal is temporarily throttled. Try again later.",
      };
    }

    if (userId === access.userId) {
      return { success: false, message: "Use account settings to delete your own account." };
    }

    const { data: member, error: memberError } = await supabase
      .from("profiles")
      .select("id,full_name,email,role")
      .eq("id", userId)
      .maybeSingle();

    if (memberError) {
      return toActionErrorState({
        source: "team.removeMember",
        message: "Member lookup failed before delete.",
        userMessage: "Could not remove the team member right now.",
        error: memberError,
        context: {
          targetUserId: userId,
          userId: access.userId,
        },
      });
    }

    if (!member) {
      return { success: false, message: "Team member not found." };
    }

    const { error } = await supabase.from("profiles").delete().eq("id", userId);

    if (error) {
      return toActionErrorState({
        source: "team.removeMember",
        message: "Member delete failed during mutation.",
        userMessage: "Could not remove the team member right now.",
        error,
        context: {
          targetUserId: userId,
          userId: access.userId,
        },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      eventType: "team.removed",
      title: `Removed ${member.full_name ?? member.email ?? "team member"}`,
      description: "A teammate was removed from the workspace.",
      metadata: {
        removedUserId: member.id,
        removedRole: member.role,
        email: member.email,
      },
    });
    await recordAnalyticsEvent({
      userId: access.userId,
      eventName: "team_member_removed",
      value: 1,
    });

    revalidatePath("/team");
    revalidatePath("/dashboard");
    return { success: true, message: "Team member removed." };
  } catch (error) {
    return toActionErrorState({
      source: "team.removeMember",
      message: "Unexpected failure while removing team member.",
      userMessage: "Could not remove the team member right now.",
      error,
      context: {
        targetUserId: userId,
      },
    });
  }
}
