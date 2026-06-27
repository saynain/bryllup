import type { ListResult } from "@/lib/storage/types";

type UploadProtocol = "form" | "tus" | "r2-multipart";
type MediaType = "image" | "video";

interface UploadedPart {
  etag: string;
  partNumber: number;
}

interface CreateUploadResponse {
  id: string;
  type: "image" | "video";
  provider: string;
  uploadMethod: "POST" | "PUT" | "PATCH";
  uploadProtocol?: UploadProtocol;
  uploadUrl?: string;
  uploadFieldName?: string;
  uploadHeaders?: Record<string, string>;
  uploadPartsUrl?: string;
  partSize?: number;
  thumbnailUploadUrl?: string;
  abortUrl?: string;
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
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "m4v", "webm", "mpeg", "mpg"]);

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
    if (!upload.uploadUrl) {
      throw new Error("Serveren mangler videoopplastingsadresse");
    }
    await uploadTus(file, upload.uploadUrl, options);
  } else if (upload.uploadProtocol === "r2-multipart") {
    await uploadR2Multipart(file, upload, options);
    return;
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

async function uploadR2Multipart(
  file: File,
  upload: CreateUploadResponse,
  options: UploadOptions
): Promise<void> {
  if (!upload.uploadPartsUrl || !upload.completeUrl || !upload.partSize) {
    throw new Error("Serveren mangler informasjon for delt videoopplasting");
  }

  const partSize = Math.max(upload.partSize, 5 * 1024 * 1024);
  const partCount = Math.ceil(file.size / partSize);
  const parts: UploadedPart[] = [];
  let uploadedBytes = 0;

  try {
    for (let partNumber = 1; partNumber <= partCount; partNumber++) {
      const start = (partNumber - 1) * partSize;
      const end = Math.min(start + partSize, file.size);
      const chunk = file.slice(start, end);
      const uploadedBeforePart = uploadedBytes;
      const part = await uploadMultipartPart(
        `${upload.uploadPartsUrl}/${partNumber}`,
        chunk,
        file.type || "application/octet-stream",
        (loaded) => {
          options.onProgress?.({
            loaded: Math.min(uploadedBeforePart + loaded, file.size),
            total: file.size,
          });
        }
      );

      parts.push(part);
      uploadedBytes += chunk.size;
      options.onProgress?.({
        loaded: Math.min(uploadedBytes, file.size),
        total: file.size,
      });
    }

    await completeR2Multipart(upload.completeUrl, parts);
    await uploadR2VideoThumbnail(file, upload).catch(() => undefined);
  } catch (error) {
    if (upload.abortUrl) {
      await fetch(upload.abortUrl, {
        method: "DELETE",
        headers: uploadRequestHeaders(),
      }).catch(() => undefined);
    }
    throw error;
  }
}

async function uploadMultipartPart(
  url: string,
  chunk: Blob,
  contentType: string,
  onProgress?: (loaded: number) => void
): Promise<UploadedPart> {
  return retryPart(async () => {
    return uploadChunkWithXhr(url, chunk, contentType, onProgress);
  });
}

function uploadChunkWithXhr(
  url: string,
  chunk: Blob,
  contentType: string,
  onProgress?: (loaded: number) => void
): Promise<UploadedPart> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.timeout = 180000;
    request.setRequestHeader("Content-Type", contentType);

    Object.entries(uploadRequestHeaders()).forEach(([key, value]) => {
      request.setRequestHeader(key, value);
    });

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(event.loaded);
      }
    };

    request.onload = () => {
      const data = parseJsonResponse(request.responseText);
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(data?.error || "En videodel feilet"));
        return;
      }

      const etag = data?.etag;
      const partNumber = data?.partNumber;
      if (typeof etag !== "string" || !Number.isInteger(partNumber)) {
        reject(new Error("Serveren svarte uten gyldig videodel"));
        return;
      }

      resolve({
        etag,
        partNumber: partNumber as number,
      });
    };

    request.onerror = () => reject(new Error("Nettverket avbrøt en videodel"));
    request.ontimeout = () => reject(new Error("En videodel brukte for lang tid"));
    request.onabort = () => reject(new Error("Videoopplastingen ble avbrutt"));
    request.send(chunk);
  });
}

async function completeR2Multipart(
  completeUrl: string,
  parts: UploadedPart[]
): Promise<void> {
  await retryPart(async () => {
    const completeResponse = await fetch(completeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...uploadRequestHeaders(),
      },
      body: JSON.stringify({ parts }),
    });

    if (!completeResponse.ok) {
      const data = await completeResponse.json().catch(() => null);
      throw new Error(data?.error || "Kunne ikke fullføre videoopplasting");
    }
  });
}

async function uploadR2VideoThumbnail(
  file: File,
  upload: CreateUploadResponse
): Promise<void> {
  if (upload.type !== "video" || !upload.thumbnailUploadUrl) {
    return;
  }

  const thumbnail = await createVideoThumbnail(file);
  if (!thumbnail) {
    return;
  }

  const response = await fetch(upload.thumbnailUploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "image/jpeg",
      ...uploadRequestHeaders(),
    },
    body: thumbnail,
  });

  if (!response.ok) {
    throw new Error("Kunne ikke lage videominiatyr");
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
  const mediaType = getFileMediaType(file);
  const response = await fetch(`${MEDIA_API_URL}/uploads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...uploadRequestHeaders(),
    },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type || fallbackMimeType(mediaType),
      mediaType,
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
  if (!upload.uploadUrl) {
    throw new Error("Serveren mangler opplastingsadresse");
  }

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

async function createVideoThumbnail(file: File): Promise<Blob | null> {
  if (typeof document === "undefined") {
    return null;
  }

  const objectUrl = URL.createObjectURL(file);

  return new Promise((resolve) => {
    const video = document.createElement("video");
    let settled = false;
    let timeoutId: number | undefined;

    const cleanup = (thumbnail: Blob | null) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
      resolve(thumbnail);
    };

    const capture = () => {
      const sourceWidth = video.videoWidth;
      const sourceHeight = video.videoHeight;

      if (!sourceWidth || !sourceHeight) {
        cleanup(null);
        return;
      }

      const maxSize = 720;
      const scale = Math.min(maxSize / sourceWidth, maxSize / sourceHeight, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sourceWidth * scale);
      canvas.height = Math.round(sourceHeight * scale);

      const context = canvas.getContext("2d");
      if (!context) {
        cleanup(null);
        return;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => cleanup(blob), "image/jpeg", 0.72);
    };

    timeoutId = window.setTimeout(() => cleanup(null), 7000);
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.addEventListener("error", () => cleanup(null), { once: true });
    video.addEventListener(
      "loadedmetadata",
      () => {
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        const seekTo = Math.min(Math.max(duration * 0.1, 0.1), 1);

        try {
          video.currentTime = seekTo;
        } catch {
          capture();
        }
      },
      { once: true }
    );
    video.addEventListener("seeked", capture, { once: true });
    video.src = objectUrl;
    video.load();
  });
}

function uploadRequestHeaders(): Record<string, string> {
  return MEDIA_UPLOAD_TOKEN ? { "X-Upload-Token": MEDIA_UPLOAD_TOKEN } : {};
}

function getFileMediaType(file: File): MediaType | null {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension) {
    return null;
  }

  if (IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }

  if (VIDEO_EXTENSIONS.has(extension)) {
    return "video";
  }

  return null;
}

function fallbackMimeType(mediaType: MediaType | null): string {
  if (mediaType === "image") {
    return "image/jpeg";
  }

  if (mediaType === "video") {
    return "video/mp4";
  }

  return "application/octet-stream";
}

function parseJsonResponse(value: string): Partial<UploadedPart> & { error?: string } | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function retryPart<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => window.setTimeout(resolve, 800 * (attempt + 1)));
    }
  }

  throw lastError;
}
