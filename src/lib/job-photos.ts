export const MAX_JOB_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_JOB_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export function isAllowedJobPhotoMimeType(value: string) {
  return ALLOWED_JOB_PHOTO_MIME_TYPES.includes(value);
}
