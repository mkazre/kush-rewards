// Store logo upload: ask the backend for a presigned storage URL, PUT the image
// bytes straight to storage, then save the returned public URL on the store.
import { ApiError, http } from "./client";
import { LOGO_MAX_BYTES, LOGO_TYPES, type LogoContentType, type LogoUploadResponse } from "../types/api";

export type PickedImage = { uri: string; mimeType?: string | null; fileSize?: number | null };

export async function uploadLogo(image: PickedImage): Promise<string> {
  const contentType = (image.mimeType ?? "image/jpeg") as LogoContentType;
  if (!(LOGO_TYPES as readonly string[]).includes(contentType)) {
    throw new ApiError(400, "Use a PNG, JPG, WEBP, GIF or SVG image");
  }
  const blob = await (await fetch(image.uri)).blob();
  const sizeBytes = image.fileSize ?? blob.size;
  if (sizeBytes > LOGO_MAX_BYTES) throw new ApiError(400, "Logo must be 5 MB or smaller");

  const { presignedUrl, headers, url } = await http.post<LogoUploadResponse>("/admin/logo_upload", { contentType, sizeBytes });
  const put = await fetch(presignedUrl, { method: "PUT", headers, body: blob });
  if (!put.ok) throw new ApiError(put.status, "Upload failed. Please try again.");
  return url;
}
