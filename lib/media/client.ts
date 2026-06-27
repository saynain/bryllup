import type { ListResult } from "@/lib/storage/types";

type UploadProtocol = "form" | "tus";

interface CreateUploadResponse {
  id: string;
  type: "image" | "video";
  provider: string;
  uploadMethod: "POST" | "PUT" | "PATCH";
  uploadProtocol?: UploadProtocol;
  uploadUrl: string;
  uploadFieldName?: string;
  uploadHeaders?: Record<string, string>;
  completeUrl?: string;
}

interface UploadProgress {
  loaded: number;
  total: number;
}

interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
}

const MEDIA_API_URL = process.env.NEXT_PUBLIC_MEDIA_API_URL?.replace(/\/$/, "");
const MEDIA_UPLOAD_TOKEN = process.env.NEXT_PUBLIC_MEDIA_UPLOAD_TOKEN;

export function isCloudflareMediaEnabled(): boolean {
  return Boolean(MEDIA_API_URL);
}

export async function fetchMediaList(params: {
  limit: number;
  cursor?: string;
}): Promise<ListResult> {
  const searchParams = new URLSearchParams();
  searchParams.set("limit", String(params.limit));
  if (params.cursor) {
    searchParams.set("cursor", params.cursor);
  }

  const response = await fetch(
    isCloudflareMediaEnabled()
      ? `${MEDIA_API_URL}/media?${searchParams}`
      : `/api/photos?${searchParams}`
  );

  if (!response.ok) {
    throw new Error("Kunne ikke hente bilder");
  }

  return response.json();
}

export async function uploadMediaFile(
  file: File,
  options: UploadOptions = {}
): Promise<void> {
  if (!isCloudflareMediaEnabled()) {
    await uploadToNextApi(file);
    options.onProgress?.({ loaded: file.size, total: file.size });
    return;
  }

  const upload = await createCloudflareUpload(file);

  if (upload.uploadProtocol === "tus") {
    await uploadTus(file, upload.uploadUrl, options);
  } else {
    await uploadFormOrPut(file, upload, options);
  }

  if (upload.completeUrl) {
    const completeResponse = await fetch(upload.completeUrl, {
      method: "POST",
      headers: uploadRequestHeaders(),
    });

    if (!completeResponse.ok) {
      throw new Error("Opplastingen ble fullført, men kunne ikke registreres");
    }
  }
}

async function uploadToNextApi(file: File): Promise<void> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Videoopplasting krever Cloudflare media-API");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/photos", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Opplasting feilet");
  }
}

async function createCloudflareUpload(file: File): Promise<CreateUploadResponse> {
  const response = await fetch(`${MEDIA_API_URL}/uploads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...uploadRequestHeaders(),
    },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Kunne ikke starte opplasting");
  }

  return data;
}

async function uploadFormOrPut(
  file: File,
  upload: CreateUploadResponse,
  options: UploadOptions
): Promise<void> {
  const method = upload.uploadMethod === "PUT" ? "PUT" : "POST";
  const headers = new Headers(upload.uploadHeaders || undefined);
  let body: BodyInit = file;

  if (method === "POST" && upload.uploadFieldName) {
    const formData = new FormData();
    formData.append(upload.uploadFieldName, file, file.name);
    body = formData;
  } else if (!headers.has("Content-Type")) {
    headers.set("Content-Type", file.type || "application/octet-stream");
  }

  const response = await fetch(upload.uploadUrl, {
    method,
    headers,
    body,
  });

  if (!response.ok) {
    throw new Error("Opplasting feilet");
  }

  options.onProgress?.({ loaded: file.size, total: file.size });
}

async function uploadTus(
  file: File,
  uploadUrl: string,
  options: UploadOptions
): Promise<void> {
  const chunkSize = getTusChunkSize();
  let offset = await getTusOffset(uploadUrl);

  while (offset < file.size) {
    const end = Math.min(offset + chunkSize, file.size);
    const chunk = file.slice(offset, end);
    const response = await fetch(uploadUrl, {
      method: "PATCH",
      headers: {
        "Tus-Resumable": "1.0.0",
        "Upload-Offset": String(offset),
        "Content-Type": "application/offset+octet-stream",
      },
      body: chunk,
    });

    if (!response.ok) {
      offset = await getTusOffset(uploadUrl);
      throw new Error("Videoopplasting feilet");
    }

    const nextOffset = Number(response.headers.get("Upload-Offset"));
    offset = Number.isFinite(nextOffset) ? nextOffset : end;
    options.onProgress?.({ loaded: offset, total: file.size });
  }
}

async function getTusOffset(uploadUrl: string): Promise<number> {
  const response = await fetch(uploadUrl, {
    method: "HEAD",
    headers: {
      "Tus-Resumable": "1.0.0",
    },
  });

  if (!response.ok) {
    return 0;
  }

  const offset = Number(response.headers.get("Upload-Offset"));
  return Number.isFinite(offset) ? offset : 0;
}

function getTusChunkSize(): number {
  if (typeof window === "undefined") {
    return 16 * 1024 * 1024;
  }

  const isMobile =
    window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;

  return isMobile ? 8 * 1024 * 1024 : 24 * 1024 * 1024;
}

function uploadRequestHeaders(): Record<string, string> {
  return MEDIA_UPLOAD_TOKEN ? { "X-Upload-Token": MEDIA_UPLOAD_TOKEN } : {};
}
