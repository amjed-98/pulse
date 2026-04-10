import "server-only";

export const AVATAR_BUCKET = "avatars";
export const PROJECT_ASSET_BUCKET = "project-assets";
export const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024;
export const AVATAR_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export const MAX_PROJECT_ASSET_FILE_SIZE = 20 * 1024 * 1024;
export const PROJECT_COVER_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export const PROJECT_ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/markdown",
  "text/plain",
] as const;

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function sanitizeExtension(extension: string | undefined) {
  return extension?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || null;
}

export function getAvatarFileExtension(file: File) {
  const fromName = sanitizeExtension(file.name.split(".").pop());

  if (fromName) {
    return fromName;
  }

  return MIME_EXTENSION_MAP[file.type] ?? "png";
}

export function buildAvatarObjectPath(userId: string, file: File) {
  const extension = getAvatarFileExtension(file);
  return `${userId}/${crypto.randomUUID()}.${extension}`;
}

export function buildProjectAssetObjectPath(projectId: string, file: File, assetType: "cover" | "attachment") {
  const extension = getAvatarFileExtension(file);
  return `${projectId}/${assetType}/${crypto.randomUUID()}.${extension}`;
}

export function extractStorageObjectPath(url: string | null | undefined, bucket: string) {
  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    const markers = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
    ];

    for (const marker of markers) {
      const markerIndex = parsedUrl.pathname.indexOf(marker);

      if (markerIndex >= 0) {
        return decodeURIComponent(parsedUrl.pathname.slice(markerIndex + marker.length));
      }
    }

    return null;
  } catch {
    return null;
  }
}
