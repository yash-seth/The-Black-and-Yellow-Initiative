"use client";

import imageCompression from "browser-image-compression";

export const MAX_PHOTOS = 4;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Compresses a user-selected photo down to a web-friendly size and re-encodes it
 * (which also strips EXIF, including any embedded GPS coordinates).
 */
export async function compressPhoto(file: File): Promise<File> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.35,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.75,
  });

  // browser-image-compression may hand back a Blob; normalise to a named File.
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([compressed], name, { type: "image/jpeg" });
}

export function isAcceptedImage(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type);
}
