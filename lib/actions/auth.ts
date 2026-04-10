"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { recordAnalyticsEvent } from "@/lib/analytics";
import { createAuditLog } from "@/lib/audit";
import { toActionErrorState, toAuthErrorState } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";
import { requireCurrentWorkspaceAccess } from "@/lib/permissions";
import { enforceRateLimit } from "@/lib/rate-limit";
import { AVATAR_BUCKET, AVATAR_MIME_TYPES, MAX_AVATAR_FILE_SIZE, buildAvatarObjectPath, extractStorageObjectPath } from "@/lib/storage";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState, AuthFormState } from "@/lib/types";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

const signUpSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters."),
    email: z.string().email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });

const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
});

const changePasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });

function withFieldErrors(error: z.ZodError): ActionState {
  return {
    success: false,
    message: "Please correct the highlighted fields.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

function getOrigin(headersList: Headers) {
  const origin = headersList.get("origin");
  const forwardedHost = headersList.get("x-forwarded-host");
  const forwardedProto = headersList.get("x-forwarded-proto") ?? "https";

  if (origin) {
    return origin;
  }

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function signIn(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  try {
    const parsed = signInSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      return withFieldErrors(parsed.error);
    }

    const signInRateLimit = await enforceRateLimit({
      scope: "auth.sign-in",
      limit: 5,
      windowMs: 5 * 60 * 1000,
      key: parsed.data.email.toLowerCase(),
    });

    if (!signInRateLimit.allowed) {
      return {
        success: false,
        email: parsed.data.email,
        message: "Too many sign-in attempts. Wait a few minutes and try again.",
      };
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      return {
        success: false,
        message: error.message,
        email: parsed.data.email,
      };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await recordAnalyticsEvent({
        userId: user.id,
        eventName: "signin_completed",
        value: 1,
      });
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
  } catch (error) {
    unstable_rethrow(error);

    return toAuthErrorState({
      source: "auth.signIn",
      message: "Unexpected failure while signing in.",
      userMessage: "Could not sign you in right now.",
      error,
      email: typeof formData.get("email") === "string" ? String(formData.get("email")) : undefined,
    });
  }
}

export async function signUp(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  try {
    const parsed = signUpSchema.safeParse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) {
      return withFieldErrors(parsed.error);
    }

    const signUpRateLimit = await enforceRateLimit({
      scope: "auth.sign-up",
      limit: 3,
      windowMs: 10 * 60 * 1000,
      key: parsed.data.email.toLowerCase(),
    });

    if (!signUpRateLimit.allowed) {
      return {
        success: false,
        email: parsed.data.email,
        message: "Too many signup attempts. Wait a few minutes and try again.",
      };
    }

    const supabase = await createSupabaseServerClient();
    const headersList = await headers();
    const origin = getOrigin(headersList);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: {
          full_name: parsed.data.fullName,
        },
      },
    });

    if (error) {
      return {
        success: false,
        message: error.message,
        email: parsed.data.email,
      };
    }

    redirect(`/signup?status=check-email&email=${encodeURIComponent(parsed.data.email)}`);
  } catch (error) {
    unstable_rethrow(error);

    return toAuthErrorState({
      source: "auth.signUp",
      message: "Unexpected failure while signing up.",
      userMessage: "Could not create the account right now.",
      error,
      email: typeof formData.get("email") === "string" ? String(formData.get("email")) : undefined,
    });
  }
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function updateProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const parsed = updateProfileSchema.safeParse({
      fullName: formData.get("fullName"),
    });

    if (!parsed.success) {
      return withFieldErrors(parsed.error);
    }

    const avatarFileEntry = formData.get("avatarFile");
    const avatarFile = avatarFileEntry instanceof File && avatarFileEntry.size > 0 ? avatarFileEntry : null;
    const removeAvatar = formData.get("removeAvatar") === "true";

    if (avatarFile && avatarFile.size > MAX_AVATAR_FILE_SIZE) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: {
          avatarFile: ["Avatar images must be 5 MB or smaller."],
        },
      };
    }

    if (avatarFile && !AVATAR_MIME_TYPES.includes(avatarFile.type as (typeof AVATAR_MIME_TYPES)[number])) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: {
          avatarFile: ["Upload a PNG, JPG, WEBP, or GIF image."],
        },
      };
    }

    const access = await requireCurrentWorkspaceAccess();
    const profileUpdateRateLimit = await enforceRateLimit({
      scope: "auth.update-profile",
      limit: 8,
      windowMs: 15 * 60 * 1000,
      key: access.userId,
    });

    if (!profileUpdateRateLimit.allowed) {
      return {
        success: false,
        message: "Profile updates are temporarily locked. Try again later.",
      };
    }

    const supabase = await createSupabaseServerClient();
    const { data: currentProfile, error: currentProfileError } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", access.userId)
      .maybeSingle();

    if (currentProfileError || !currentProfile) {
      return toActionErrorState({
        source: "auth.updateProfile",
        message: "Profile update could not load the current profile.",
        userMessage: "Could not update the profile right now.",
        error: currentProfileError ?? new Error("Profile not found."),
        context: {
          userId: access.userId,
        },
      });
    }

    const existingAvatarPath = extractStorageObjectPath(currentProfile.avatar_url, AVATAR_BUCKET);
    let nextAvatarUrl = removeAvatar ? null : currentProfile.avatar_url;
    let uploadedAvatarPath: string | null = null;

    if (avatarFile) {
      const avatarObjectPath = buildAvatarObjectPath(access.userId, avatarFile);
      const uploadResult = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(avatarObjectPath, new Uint8Array(await avatarFile.arrayBuffer()), {
          cacheControl: "3600",
          contentType: avatarFile.type,
          upsert: false,
        });

      if (uploadResult.error) {
        return toActionErrorState({
          source: "auth.updateProfile",
          message: "Avatar upload failed in Supabase storage.",
          userMessage: "Could not upload the avatar right now.",
          error: uploadResult.error,
          context: {
            userId: access.userId,
          },
        });
      }

      uploadedAvatarPath = avatarObjectPath;
      nextAvatarUrl = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarObjectPath).data.publicUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.data.fullName,
        avatar_url: nextAvatarUrl,
      })
      .eq("id", access.userId);

    if (error) {
      if (uploadedAvatarPath) {
        await supabase.storage.from(AVATAR_BUCKET).remove([uploadedAvatarPath]);
      }

      return toActionErrorState({
        source: "auth.updateProfile",
        message: "Profile update failed during mutation.",
        userMessage: "Could not update the profile right now.",
        error,
        context: {
          userId: access.userId,
        },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      eventType: "auth.profile_updated",
      title: "Updated profile",
      description: "Profile identity details were changed in account settings.",
      metadata: {
        fullName: parsed.data.fullName,
        avatarUrl: nextAvatarUrl,
        avatarUploaded: Boolean(uploadedAvatarPath),
        avatarRemoved: removeAvatar,
      },
    });
    await recordAnalyticsEvent({
      userId: access.userId,
      eventName: "profile_updated",
      value: 1,
    });
    await createNotification({
      userId: access.userId,
      type: "info",
      title: "Profile updated",
      message: "Your account profile details were updated successfully.",
      targetPath: "/settings",
    });

    if (existingAvatarPath && (removeAvatar || uploadedAvatarPath)) {
      await supabase.storage.from(AVATAR_BUCKET).remove([existingAvatarPath]);
    }

    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return {
      success: true,
      message: "Profile updated.",
      payload: {
        avatarUrl: nextAvatarUrl,
      },
    };
  } catch (error) {
    return toActionErrorState({
      source: "auth.updateProfile",
      message: "Unexpected failure while updating profile.",
      userMessage: "Could not update the profile right now.",
      error,
    });
  }
}

export async function changePassword(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const parsed = changePasswordSchema.safeParse({
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) {
      return withFieldErrors(parsed.error);
    }

    const access = await requireCurrentWorkspaceAccess();
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      return toActionErrorState({
        source: "auth.changePassword",
        message: "Password update failed via Supabase auth.",
        userMessage: "Could not update the password right now.",
        error,
        context: {
          userId: access.userId,
        },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      eventType: "auth.password_changed",
      title: "Updated password",
      description: "Account credentials were rotated from the settings page.",
    });
    await recordAnalyticsEvent({
      userId: access.userId,
      eventName: "password_changed",
      value: 1,
    });
    await createNotification({
      userId: access.userId,
      type: "system",
      title: "Password updated",
      message: "Your account password was changed.",
      targetPath: "/settings",
    });

    return { success: true, message: "Password updated." };
  } catch (error) {
    return toActionErrorState({
      source: "auth.changePassword",
      message: "Unexpected failure while changing password.",
      userMessage: "Could not update the password right now.",
      error,
    });
  }
}

export async function deleteAccount(): Promise<ActionState> {
  try {
    const access = await requireCurrentWorkspaceAccess();
    const deleteAccountRateLimit = await enforceRateLimit({
      scope: "auth.delete-account",
      limit: 2,
      windowMs: 60 * 60 * 1000,
      key: access.userId,
    });

    if (!deleteAccountRateLimit.allowed) {
      return {
        success: false,
        message: "Account deletion is temporarily locked. Try again later.",
      };
    }

    const adminClient = await createSupabaseAdminClient();

    if (!adminClient) {
      return {
        success: false,
        message: "Set SUPABASE_SERVICE_ROLE_KEY to enable account deletion.",
      };
    }

    const { error } = await adminClient.auth.admin.deleteUser(access.userId);

    if (error) {
      return toActionErrorState({
        source: "auth.deleteAccount",
        message: "Account deletion failed via Supabase admin client.",
        userMessage: "Could not delete the account right now.",
        error,
        context: {
          userId: access.userId,
        },
      });
    }

    revalidatePath("/", "layout");
    redirect("/signup");
  } catch (error) {
    return toActionErrorState({
      source: "auth.deleteAccount",
      message: "Unexpected failure while deleting account.",
      userMessage: "Could not delete the account right now.",
      error,
    });
  }
}
