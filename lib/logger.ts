import "server-only";

import { headers } from "next/headers";

import type { ActionState, AuthFormState } from "@/lib/types";

type LogLevel = "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  source: string;
  message: string;
  referenceId?: string;
  context?: Record<string, unknown>;
  error?: unknown;
}

interface ActionErrorOptions {
  source: string;
  message: string;
  error: unknown;
  context?: Record<string, unknown>;
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    value: error,
  };
}

async function getRequestMetadata() {
  try {
    const requestHeaders = await headers();

    return {
      requestId: requestHeaders.get("x-request-id") ?? null,
      path: requestHeaders.get("x-pathname") ?? null,
      method: requestHeaders.get("x-request-method") ?? null,
      host: requestHeaders.get("host") ?? null,
    };
  } catch {
    return {
      requestId: null,
      path: null,
      method: null,
      host: null,
    };
  }
}

export function createReferenceId(prefix = "pulse") {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export async function logServerEvent(payload: Omit<LogPayload, "level"> & { level?: LogLevel }) {
  const request = await getRequestMetadata();
  const entry = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    level: payload.level ?? "info",
    source: payload.source,
    message: payload.message,
    referenceId: payload.referenceId ?? null,
    request,
    context: payload.context ?? null,
    error: payload.error ? normalizeError(payload.error) : null,
  };

  const serialized = JSON.stringify(entry);

  if ((payload.level ?? "info") === "error") {
    console.error(serialized);
    return;
  }

  if ((payload.level ?? "info") === "warn") {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}

export async function logServerError(options: ActionErrorOptions) {
  const referenceId = createReferenceId();

  await logServerEvent({
    level: "error",
    source: options.source,
    message: options.message,
    referenceId,
    context: options.context,
    error: options.error,
  });

  return referenceId;
}

export async function toActionErrorState(
  options: ActionErrorOptions & {
    userMessage: string;
  },
): Promise<ActionState> {
  const referenceId = await logServerError(options);

  return {
    success: false,
    errorId: referenceId,
    message: `${options.userMessage} Reference: ${referenceId}`,
  };
}

export async function toAuthErrorState(
  options: ActionErrorOptions & {
    userMessage: string;
    email?: string;
  },
): Promise<AuthFormState> {
  const referenceId = await logServerError(options);

  return {
    success: false,
    errorId: referenceId,
    email: options.email,
    message: `${options.userMessage} Reference: ${referenceId}`,
  };
}
