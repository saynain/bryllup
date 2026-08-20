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

interface AdminMediaList extends ListResult {
  readOnly?: boolean;
}

interface AdminMutationResult {
  dryRun?: boolean;
}

interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  uploadedBy?: string;
  uploadMessage?: string;
}

export class MediaUploadError extends Error {
  readonly status?: number;
  readonly retryable: boolean;

  constructor(message: string, options: { status?: number; retryable?: boolean } = {}) {
    super(message);
    this.name = "MediaUploadError";
    this.status = options.status;
    this.retryable = options.retryable ?? true;
  }
}

const MEDIA_API_URL = process.env.NEXT_PUBLIC_MEDIA_API_URL?.replace(/\/$/, "");
const MEDIA_ADMIN_API_URL = process.env.NEXT_PUBLIC_MEDIA_ADMIN_API_URL?.replace(/\/$/, "");
const TEST_MEDIA_ADMIN_API_URL = "https://bryllup-media-staging.saynain.workers.dev";
const MEDIA_UPLOAD_TOKEN = process.env.NEXT_PUBLIC_MEDIA_UPLOAD_TOKEN;
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "m4v", "webm", "mpeg", "mpg"]);

export function isCloudflareMediaEnabled(): boolean {
  return Boolean(MEDIA_API_URL);
}

export function getPhotoArchiveUrl(): string | undefined {
  return MEDIA_API_URL ? `${MEDIA_API_URL}/downloads/photos.zip` : undefined;
}

export function isRetryableUploadError(error: unknown): boolean {
  return error instanceof MediaUploadError ? error.retryable : true;
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

export async function fetchAdminMedia(adminToken: string): Promise<AdminMediaList> {
  const response = await fetch(mediaAdminUrl("/admin/media"), {
    headers: adminHeaders(adminToken),
    cache: "no-store",
  });

  if (!response.ok) {
    throw await adminResponseError(response, "Kunne ikke åpne administrasjonen");
  }

  return response.json();
}

export async function updateMediaOrder(
  adminToken: string,
  ids: string[]
): Promise<AdminMutationResult> {
  const response = await fetch(mediaAdminUrl("/admin/media/order"), {
    method: "PATCH",
    headers: adminHeaders(adminToken, true),
    body: JSON.stringify({ ids }),
  });

  if (!response.ok) {
    throw await adminResponseError(response, "Kunne ikke lagre rekkefølgen");
  }
  return response.json();
}

export async function deleteAdminMedia(
  adminToken: string,
  ids: string[]
): Promise<AdminMutationResult> {
  const response = await fetch(mediaAdminUrl("/admin/media"), {
    method: "DELETE",
    headers: adminHeaders(adminToken, true),
    body: JSON.stringify({ ids }),
  });

  if (!response.ok) {
    throw await adminResponseError(response, "Kunne ikke slette de valgte bildene");
  }
  return response.json();
}

export async function restoreAdminMedia(
  adminToken: string,
  ids: string[]
): Promise<AdminMutationResult> {
  const response = await fetch(mediaAdminUrl("/admin/media/restore"), {
    method: "POST",
    headers: adminHeaders(adminToken, true),
    body: JSON.stringify({ ids }),
  });

  if (!response.ok) {
    throw await adminResponseError(response, "Kunne ikke angre slettingen");
  }
  return response.json();
}

function mediaAdminUrl(path: string): string {
  const isTestHost =
    typeof window !== "undefined" && window.location.hostname === "test.bryllup.rylands.no";
  const baseUrl = MEDIA_ADMIN_API_URL || (isTestHost ? TEST_MEDIA_ADMIN_API_URL : MEDIA_API_URL);
  if (!baseUrl) {
    throw new Error("Mediaadministrasjon krever Cloudflare-galleriet");
  }
  return `${baseUrl}${path}`;
}

function adminHeaders(adminToken: string, json = false): HeadersInit {
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    "X-Admin-Token": adminToken,
  };
}

async function adminResponseError(response: Response, fallback: string): Promise<Error> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return new Error(payload?.error || fallback);
}

export async function uploadMediaFile(
  file: File,
  options: UploadOptions = {}
): Promise<void> {
  if (!isCloudflareMediaEnabled()) {
    await uploadToNextApi(file, options);
    options.onProgress?.({ loaded: file.size, total: file.size });
    return;
  }

  const uploadFile = await prepareFileForCloudflareUpload(file);
  const upload = await createCloudflareUpload(uploadFile, options);

  if (upload.uploadProtocol === "tus") {
    if (!upload.uploadUrl) {
      throw new Error("Serveren mangler videoopplastingsadresse");
    }
    await uploadTus(uploadFile, upload.uploadUrl, options);
  } else if (upload.uploadProtocol === "r2-multipart") {
    await uploadR2Multipart(uploadFile, upload, options);
    return;
  } else {
    await uploadFormOrPut(uploadFile, upload, options);
  }

  if (upload.completeUrl) {
    const completeResponse = await fetch(upload.completeUrl, {
      method: "POST",
      headers: uploadRequestHeaders(),
    });

    if (!completeResponse.ok) {
      const data = await completeResponse.json().catch(() => null);
      throw uploadError(
        data?.error || "Opplastingen ble fullført, men kunne ikke registreres",
        completeResponse.status
      );
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
        reject(uploadError(data?.error || "En videodel feilet", request.status));
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

    request.onerror = () => reject(new MediaUploadError("Nettverket avbrøt en videodel"));
    request.ontimeout = () => reject(new MediaUploadError("En videodel brukte for lang tid"));
    request.onabort = () =>
      reject(new MediaUploadError("Videoopplastingen ble avbrutt", { retryable: false }));
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
      throw uploadError(
        data?.error || "Kunne ikke fullføre videoopplasting",
        completeResponse.status
      );
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

async function uploadToNextApi(file: File, options: UploadOptions): Promise<void> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Videoopplasting krever Cloudflare media-API");
  }

  const formData = new FormData();
  formData.append("file", file);
  const uploadedBy = cleanOptionalText(options.uploadedBy, 120);
  const uploadMessage = cleanOptionalText(options.uploadMessage, 500);
  if (uploadedBy) {
    formData.append("uploadedBy", uploadedBy);
  }
  if (uploadMessage) {
    formData.append("uploadMessage", uploadMessage);
  }

  const response = await fetch("/api/photos", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw uploadError(data?.error || "Opplasting feilet", response.status);
  }
}

async function createCloudflareUpload(
  file: File,
  options: UploadOptions
): Promise<CreateUploadResponse> {
  const mediaType = getFileMediaType(file);
  const uploadedBy = cleanOptionalText(options.uploadedBy, 120);
  const uploadMessage = cleanOptionalText(options.uploadMessage, 500);
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
      takenAt: fileTakenAt(file),
      uploadedBy,
      uploadMessage,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw uploadError(data?.error || "Kunne ikke starte opplasting", response.status);
  }

  return data;
}

async function prepareFileForCloudflareUpload(file: File): Promise<File> {
  if (getFileMediaType(file) !== "image" || !isHeicFile(file)) {
    return file;
  }

  return convertHeicToJpeg(file);
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const jpeg = await renderImageToJpeg(file);
  const filename = file.name.replace(/\.(heic|heif)$/i, ".jpg") || `${file.name}.jpg`;

  return new File([jpeg], filename, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
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
  let body: XMLHttpRequestBodyInit = file;

  if (method === "POST" && upload.uploadFieldName) {
    const formData = new FormData();
    formData.append(upload.uploadFieldName, file, file.name);
    body = formData;
  } else if (!headers.has("Content-Type")) {
    headers.set("Content-Type", file.type || "application/octet-stream");
  }

  if (shouldAttachUploadToken(upload.uploadUrl)) {
    Object.entries(uploadRequestHeaders()).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }

  await uploadBodyWithXhr(
    upload.uploadUrl,
    method,
    headers,
    body,
    file.size,
    options.onProgress
  );
}

function uploadBodyWithXhr(
  url: string,
  method: "POST" | "PUT" | "PATCH",
  headers: Headers,
  body: XMLHttpRequestBodyInit,
  totalBytes: number,
  onProgress?: (progress: UploadProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(method, url);
    request.timeout = 180000;

    headers.forEach((value, key) => {
      request.setRequestHeader(key, value);
    });

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.({ loaded: event.loaded, total: event.total || totalBytes });
      }
    };

    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        const data = parseJsonResponse(request.responseText);
        reject(uploadError(data?.error || "Opplasting feilet", request.status));
        return;
      }

      onProgress?.({ loaded: totalBytes, total: totalBytes });
      resolve();
    };

    request.onerror = () => reject(new MediaUploadError("Nettverket avbrøt opplastingen"));
    request.ontimeout = () => reject(new MediaUploadError("Opplastingen brukte for lang tid"));
    request.onabort = () =>
      reject(new MediaUploadError("Opplastingen ble avbrutt", { retryable: false }));
    request.send(body);
  });
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
      throw uploadError("Videoopplasting feilet", response.status);
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

function cleanOptionalText(value: string | undefined, maxLength: number): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

async function renderImageToJpeg(file: File): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("HEIC-bildet kunne ikke konverteres i denne nettleseren");
  }

  const objectUrl = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;
    let timeoutId: number | undefined;

    const cleanup = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      URL.revokeObjectURL(objectUrl);
    };

    const fail = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(
        new MediaUploadError(
          "iPhone-bildet kunne ikke konverteres. Prøv å velge JPEG-kompatibel eksport.",
          { retryable: false }
        )
      );
    };

    const done = (blob: Blob | null) => {
      if (settled) {
        return;
      }
      if (!blob) {
        fail();
        return;
      }
      settled = true;
      cleanup();
      resolve(blob);
    };

    image.onload = () => {
      const sourceWidth = image.naturalWidth;
      const sourceHeight = image.naturalHeight;

      if (!sourceWidth || !sourceHeight) {
        fail();
        return;
      }

      const maxSize = 2560;
      const scale = Math.min(maxSize / sourceWidth, maxSize / sourceHeight, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));

      const context = canvas.getContext("2d");
      if (!context) {
        fail();
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(done, "image/jpeg", 0.86);
    };

    image.onerror = fail;
    timeoutId = window.setTimeout(fail, 10000);
    image.src = objectUrl;
  });
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

function isHeicFile(file: File): boolean {
  const mimeType = file.type.toLowerCase();
  if (mimeType === "image/heic" || mimeType === "image/heif") {
    return true;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension === "heic" || extension === "heif";
}

function shouldAttachUploadToken(url: string): boolean {
  return Boolean(MEDIA_UPLOAD_TOKEN && MEDIA_API_URL && url.startsWith(MEDIA_API_URL));
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

function fileTakenAt(file: File): string | undefined {
  if (!Number.isFinite(file.lastModified) || file.lastModified <= 0) {
    return undefined;
  }

  return new Date(file.lastModified).toISOString();
}

function parseJsonResponse(value: string): Partial<UploadedPart> & { error?: string } | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function uploadError(message: string, status: number): MediaUploadError {
  return new MediaUploadError(message, {
    status,
    retryable: isRetryableStatus(status),
  });
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

async function retryPart<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryableUploadError(error) || attempt === 2) {
        break;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 800 * (attempt + 1)));
    }
  }

  throw lastError;
}
