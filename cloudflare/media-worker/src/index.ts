type MediaType = "image" | "video";
type MediaStatus = "pending" | "processing" | "ready" | "error";
type UploadMethod = "POST" | "PUT" | "PATCH";
type UploadProtocol = "form" | "tus" | "r2-multipart";
type ImageUploadProvider =
  | "auto"
  | "r2"
  | "cloudflare-images"
  | "cloudflare-images-hosted"
  | "images"
  | "images-hosted";

interface AppSubtleCrypto extends SubtleCrypto {
  timingSafeEqual(
    a: ArrayBuffer | ArrayBufferView,
    b: ArrayBuffer | ArrayBufferView
  ): boolean;
}

interface MediaCursor {
  sortAt: string;
  createdAt: string;
  id: string;
}

interface AppExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface AppD1PreparedStatement {
  bind(...values: unknown[]): AppD1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

interface AppD1Database {
  prepare(query: string): AppD1PreparedStatement;
}

interface AppR2Object {
  body?: ReadableStream<Uint8Array> | null;
  httpEtag?: string;
  size?: number;
}

interface AppR2UploadedPart {
  etag: string;
  partNumber: number;
}

interface AppR2MultipartUpload {
  key: string;
  uploadId: string;
  uploadPart(
    partNumber: number,
    value: ReadableStream<Uint8Array> | ArrayBuffer | ArrayBufferView | Blob | string
  ): Promise<AppR2UploadedPart>;
  complete(uploadedParts: AppR2UploadedPart[]): Promise<{ key?: string; httpEtag?: string }>;
  abort(): Promise<void>;
}

interface AppR2Bucket {
  head(key: string): Promise<AppR2Object | null>;
  put(
    key: string,
    value: ReadableStream<Uint8Array> | ArrayBuffer | string | null,
    options?: {
      httpMetadata?: {
        contentType?: string;
        contentDisposition?: string;
        cacheControl?: string;
      };
      customMetadata?: Record<string, string>;
    }
  ): Promise<unknown>;
  get(
    key: string,
    options?: {
      range?: { offset?: number; length?: number; suffix?: number };
    }
  ): Promise<AppR2Object | null>;
  createMultipartUpload(
    key: string,
    options?: {
      httpMetadata?: {
        contentType?: string;
        contentDisposition?: string;
        cacheControl?: string;
      };
      customMetadata?: Record<string, string>;
    }
  ): Promise<AppR2MultipartUpload>;
  resumeMultipartUpload(key: string, uploadId: string): AppR2MultipartUpload;
}

interface AppStreamVideo {
  id: string;
  thumbnail: string;
  readyToStream: boolean;
  status: {
    state: string;
    errorReasonCode?: string;
    errorReasonText?: string;
  };
  meta: Record<string, string>;
  duration: number;
  preview?: string;
}

interface AppStreamVideoHandle {
  details(): Promise<AppStreamVideo>;
}

interface StreamBinding {
  upload(
    url: string,
    options?: {
      creator?: string;
      meta?: Record<string, string>;
      requireSignedURLs?: boolean;
      thumbnailTimestampPct?: number;
    }
  ): Promise<AppStreamVideo>;
  video(id: string): AppStreamVideoHandle;
  videos: {
    list(options?: { limit?: number }): Promise<AppStreamVideo[]>;
  };
  createDirectUpload(options: {
    maxDurationSeconds: number;
    meta?: Record<string, string>;
  }): Promise<{ id?: string; uid?: string; uploadURL: string }>;
}

interface HostedImageMetadata {
  id?: string;
  variants?: string[];
}

interface AppImageTransformationResult {
  response(options?: { headers?: HeadersInit }): Response;
}

interface AppImageTransformer {
  transform(options: {
    width?: number;
    height?: number;
    fit?: "scale-down" | "contain" | "cover" | "crop";
    gravity?: "auto" | "center" | "entropy";
  }): AppImageTransformer;
  output(options: {
    format: "image/webp";
    quality?: number;
    anim?: boolean;
  }): Promise<AppImageTransformationResult>;
}

interface ImagesBinding {
  input(stream: ReadableStream<Uint8Array>): AppImageTransformer;
  hosted?: {
    upload(
      image: ReadableStream<Uint8Array> | ArrayBuffer,
      options?: {
        id?: string;
        filename?: string;
        requireSignedURLs?: boolean;
        metadata?: Record<string, unknown>;
        creator?: string;
      }
    ): Promise<HostedImageMetadata>;
  };
}

interface Env {
  MEDIA_BUCKET: AppR2Bucket;
  DB: AppD1Database;
  STREAM?: StreamBinding;
  IMAGES?: ImagesBinding;
  CORS_ORIGINS?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  IMAGE_DELIVERY_BASE_URL?: string;
  IMAGE_VARIANT_PUBLIC?: string;
  IMAGE_VARIANT_THUMB?: string;
  IMAGE_UPLOAD_PROVIDER?: ImageUploadProvider;
  MAX_IMAGE_BYTES?: string;
  MAX_VIDEO_BYTES?: string;
  R2_MULTIPART_PART_BYTES?: string;
  STREAM_BASIC_MAX_BYTES?: string;
  STREAM_MAX_DURATION_SECONDS?: string;
  STREAM_UPLOAD_PROTOCOL?: "auto" | "form" | "tus" | "r2-multipart";
  UPLOAD_TOKEN?: string;
  ARCHIVE_UPLOAD_TOKEN?: string;
  MIGRATION_TOKEN?: string;
}

interface MediaRow {
  id: string;
  provider: string;
  media_type: MediaType;
  status: MediaStatus;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  uploaded_by: string | null;
  upload_message: string | null;
  object_key: string | null;
  provider_id: string | null;
  url: string | null;
  thumbnail_url: string | null;
  taken_at: string | null;
  created_at: string;
  uploaded_at: string | null;
  updated_at: string;
  error: string | null;
  sort_at?: string;
}

interface CreateUploadRequest {
  filename?: string;
  mimeType?: string;
  mediaType?: MediaType;
  size?: number;
  uploadedBy?: string;
  uploadMessage?: string;
  takenAt?: string;
}

interface StreamMigrationRow {
  media_id: string;
  stream_id: string;
  source_provider: string;
  source_object_key: string | null;
  status: string;
  error: string | null;
  created_at: string;
  updated_at: string;
}

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
  "video/mpeg",
]);

const DEFAULT_MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const DEFAULT_MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024;
const DEFAULT_R2_MULTIPART_PART_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_THUMBNAIL_BYTES = 1_500_000;
const DEFAULT_STREAM_BASIC_MAX_BYTES = 190 * 1024 * 1024;
const DEFAULT_STREAM_MAX_DURATION_SECONDS = 60 * 60;
const PHOTO_ARCHIVE_KEY = "archives/silje-og-sindre-bilder.zip";
const PHOTO_ARCHIVE_FILENAME = "silje-og-sindre-bilder.zip";
const PHOTO_ARCHIVE_PART_BYTES = 20 * 1024 * 1024;
const IMMUTABLE_MEDIA_CACHE_CONTROL =
  "public, max-age=31536000, s-maxage=31536000, immutable";
const PHOTO_ARCHIVE_CACHE_CONTROL = "public, max-age=3600, s-maxage=3600";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx?: AppExecutionContext
  ): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    const url = new URL(request.url);
    const path = trimTrailingSlash(url.pathname);

    try {
      if (request.method === "GET" && path === "/health") {
        return json(request, env, { ok: true });
      }

      if (request.method === "GET" && path === "/media") {
        return listMedia(request, env);
      }

      if (
        (request.method === "GET" || request.method === "HEAD") &&
        path === "/downloads/photos.zip"
      ) {
        return getPhotoArchive(request, env);
      }

      if (request.method === "POST" && path === "/downloads/photos.zip/upload") {
        requirePhotoArchiveUploadToken(request, env);
        return createPhotoArchiveUpload(request, env);
      }

      const archivePartMatch = path.match(
        /^\/downloads\/photos\.zip\/upload\/parts\/(\d+)$/
      );
      if (request.method === "PUT" && archivePartMatch) {
        requirePhotoArchiveUploadToken(request, env);
        return uploadPhotoArchivePart(request, env, Number(archivePartMatch[1]));
      }

      if (
        request.method === "POST" &&
        path === "/downloads/photos.zip/upload/complete"
      ) {
        requirePhotoArchiveUploadToken(request, env);
        return completePhotoArchiveUpload(request, env);
      }

      if (
        request.method === "DELETE" &&
        path === "/downloads/photos.zip/upload"
      ) {
        requirePhotoArchiveUploadToken(request, env);
        return abortPhotoArchiveUpload(request, env);
      }

      if (request.method === "GET" && path === "/admin/stream-migrations") {
        await requireMigrationToken(request, env);
        return listStreamMigrations(request, env);
      }

      const streamMigrationFinalizeMatch = path.match(
        /^\/admin\/stream-migrations\/([^/]+)\/finalize$/
      );
      if (request.method === "POST" && streamMigrationFinalizeMatch) {
        await requireMigrationToken(request, env);
        return finalizeStreamMigration(
          request,
          env,
          decodeURIComponent(streamMigrationFinalizeMatch[1])
        );
      }

      const streamMigrationMatch = path.match(
        /^\/admin\/stream-migrations\/([^/]+)$/
      );
      if (request.method === "POST" && streamMigrationMatch) {
        await requireMigrationToken(request, env);
        return startStreamMigration(
          request,
          env,
          decodeURIComponent(streamMigrationMatch[1])
        );
      }

      const mediaMatch = path.match(/^\/media\/([^/]+)$/);
      if (request.method === "GET" && mediaMatch) {
        return getMedia(request, env, decodeURIComponent(mediaMatch[1]));
      }

      const contentMatch = path.match(/^\/media\/([^/]+)\/content$/);
      if (request.method === "GET" && contentMatch) {
        return getR2Content(request, env, decodeURIComponent(contentMatch[1]), ctx);
      }

      const downloadMatch = path.match(/^\/media\/([^/]+)\/download$/);
      if (request.method === "GET" && downloadMatch) {
        return getR2Content(
          request,
          env,
          decodeURIComponent(downloadMatch[1]),
          ctx,
          "attachment"
        );
      }

      const thumbnailMatch = path.match(/^\/media\/([^/]+)\/thumbnail$/);
      if (request.method === "GET" && thumbnailMatch) {
        return getR2Thumbnail(request, env, decodeURIComponent(thumbnailMatch[1]), ctx);
      }

      const previewMatch = path.match(/^\/media\/([^/]+)\/preview$/);
      if (request.method === "GET" && previewMatch) {
        return getR2ImageVariant(
          request,
          env,
          decodeURIComponent(previewMatch[1]),
          "preview",
          ctx
        );
      }

      if (request.method === "POST" && path === "/uploads") {
        requireUploadToken(request, env);
        return createUpload(request, env);
      }

      const r2UploadMatch = path.match(/^\/uploads\/r2\/([^/]+)$/);
      if (request.method === "PUT" && r2UploadMatch) {
        requireUploadToken(request, env);
        return uploadR2Object(request, env, decodeURIComponent(r2UploadMatch[1]));
      }

      const r2MultipartPartMatch = path.match(
        /^\/uploads\/r2-multipart\/([^/]+)\/parts\/(\d+)$/
      );
      if (request.method === "PUT" && r2MultipartPartMatch) {
        requireUploadToken(request, env);
        return uploadR2MultipartPart(
          request,
          env,
          decodeURIComponent(r2MultipartPartMatch[1]),
          Number(r2MultipartPartMatch[2])
        );
      }

      const r2MultipartCompleteMatch = path.match(
        /^\/uploads\/r2-multipart\/([^/]+)\/complete$/
      );
      if (request.method === "POST" && r2MultipartCompleteMatch) {
        requireUploadToken(request, env);
        return completeR2MultipartUpload(
          request,
          env,
          decodeURIComponent(r2MultipartCompleteMatch[1])
        );
      }

      const r2MultipartThumbnailMatch = path.match(
        /^\/uploads\/r2-multipart\/([^/]+)\/thumbnail$/
      );
      if (request.method === "PUT" && r2MultipartThumbnailMatch) {
        requireUploadToken(request, env);
        return uploadR2VideoThumbnail(
          request,
          env,
          decodeURIComponent(r2MultipartThumbnailMatch[1])
        );
      }

      const r2MultipartAbortMatch = path.match(
        /^\/uploads\/r2-multipart\/([^/]+)$/
      );
      if (request.method === "DELETE" && r2MultipartAbortMatch) {
        requireUploadToken(request, env);
        return abortR2MultipartUpload(
          request,
          env,
          decodeURIComponent(r2MultipartAbortMatch[1])
        );
      }

      const imageUploadMatch = path.match(/^\/uploads\/images\/([^/]+)$/);
      if (request.method === "PUT" && imageUploadMatch) {
        requireUploadToken(request, env);
        return uploadHostedImage(request, env, decodeURIComponent(imageUploadMatch[1]));
      }

      const completeMatch = path.match(/^\/uploads\/([^/]+)\/complete$/);
      if (request.method === "POST" && completeMatch) {
        requireUploadToken(request, env);
        return completeUpload(request, env, decodeURIComponent(completeMatch[1]));
      }

      return json(request, env, { error: "Not found" }, 404);
    } catch (error) {
      const message = unknownErrorMessage(error);
      const status = error instanceof HttpError ? error.status : 500;
      return json(request, env, { error: message }, status);
    }
  },
};

async function listMedia(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const limit = clamp(parseInteger(url.searchParams.get("limit"), 24), 1, 100);
  const cursor = parseMediaCursor(url.searchParams.get("cursor"));
  const sortExpression = "COALESCE(taken_at, uploaded_at, created_at)";

  const statement = cursor
    ? env.DB.prepare(
        `SELECT *, ${sortExpression} AS sort_at FROM media
         WHERE status IN ('ready', 'processing')
           AND (
             ${sortExpression} > ?
             OR (${sortExpression} = ? AND created_at > ?)
             OR (${sortExpression} = ? AND created_at = ? AND id > ?)
           )
         ORDER BY ${sortExpression} ASC, created_at ASC, id ASC
         LIMIT ?`
      ).bind(
        cursor.sortAt,
        cursor.sortAt,
        cursor.createdAt,
        cursor.sortAt,
        cursor.createdAt,
        cursor.id,
        limit + 1
      )
    : env.DB.prepare(
        `SELECT *, ${sortExpression} AS sort_at FROM media
         WHERE status IN ('ready', 'processing')
         ORDER BY ${sortExpression} ASC, created_at ASC, id ASC
         LIMIT ?`
      ).bind(limit + 1);

  const rows = (await statement.all<MediaRow>()).results;
  const page = rows.slice(0, limit);
  const hasMore = rows.length > limit;

  return json(request, env, {
    photos: page.map((row) => toPublicMedia(row, request)),
    nextCursor: hasMore ? encodeMediaCursor(page[page.length - 1]) : undefined,
    hasMore,
  });
}

async function getMedia(request: Request, env: Env, id: string): Promise<Response> {
  const row = await findMedia(env, id);
  if (!row) {
    return json(request, env, { error: "Media not found" }, 404);
  }

  return json(request, env, toPublicMedia(row, request));
}

async function createUpload(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as CreateUploadRequest;
  const filename = sanitizeFilename(body.filename || "");
  const originalName = (body.filename || filename).slice(0, 240);
  const mimeType = (body.mimeType || "").toLowerCase();
  const size = Number(body.size || 0);
  const uploadedBy = sanitizeOptionalText(body.uploadedBy, 120);
  const uploadMessage = sanitizeOptionalText(body.uploadMessage, 500);
  const takenAt = parseOptionalIsoDate(body.takenAt);

  if (!filename || !mimeType || !Number.isFinite(size) || size <= 0) {
    return json(request, env, { error: "Missing filename, mimeType or size" }, 400);
  }

  const requestedMediaType =
    body.mediaType === "image" || body.mediaType === "video" ? body.mediaType : null;
  const mediaType = detectMediaType(mimeType) || requestedMediaType;
  if (!mediaType) {
    return json(request, env, { error: "Unsupported file type" }, 400);
  }

  const maxBytes =
    mediaType === "image"
      ? parseInteger(env.MAX_IMAGE_BYTES, DEFAULT_MAX_IMAGE_BYTES)
      : parseInteger(env.MAX_VIDEO_BYTES, DEFAULT_MAX_VIDEO_BYTES);

  if (size > maxBytes) {
    return json(request, env, { error: "File exceeds configured upload limit" }, 413);
  }

  if (mediaType === "image") {
    const imageProvider = imageUploadProvider(env);

    if (imageProvider === "r2") {
      return createR2Upload(request, env, {
        mediaType,
        filename,
        originalName,
        mimeType,
        size,
        uploadedBy,
        uploadMessage,
        takenAt,
      });
    }

    if (imageProvider === "cloudflare-images") {
      if (!canUseCloudflareImages(env)) {
        return json(request, env, { error: "Cloudflare Images upload is not configured" }, 500);
      }

      return createImageDirectUpload(request, env, {
        filename,
        originalName,
        mimeType,
        size,
        uploadedBy,
        uploadMessage,
        takenAt,
      });
    }

    if (imageProvider === "cloudflare-images-hosted") {
      if (!canUseHostedImages(env)) {
        return json(request, env, { error: "Cloudflare Images binding is not configured" }, 500);
      }

      return createHostedImageUpload(request, env, {
        mediaType,
        filename,
        originalName,
        mimeType,
        size,
        uploadedBy,
        uploadMessage,
        takenAt,
      });
    }

    if (canUseCloudflareImages(env)) {
      return createImageDirectUpload(request, env, {
        filename,
        originalName,
        mimeType,
        size,
        uploadedBy,
        uploadMessage,
        takenAt,
      });
    }

    if (canUseHostedImages(env)) {
      return createHostedImageUpload(request, env, {
        mediaType,
        filename,
        originalName,
        mimeType,
        size,
        uploadedBy,
        uploadMessage,
        takenAt,
      });
    }

    return createR2Upload(request, env, {
      mediaType,
      filename,
      originalName,
      mimeType,
      size,
      uploadedBy,
      uploadMessage,
      takenAt,
    });
  }

  if (canUseStreamRest(env) && env.STREAM_UPLOAD_PROTOCOL !== "r2-multipart") {
    try {
      return await createStreamRestUpload(request, env, {
        filename,
        originalName,
        mimeType,
        size,
        uploadedBy,
        uploadMessage,
        takenAt,
      });
    } catch (error) {
      console.warn("Falling back to R2 multipart video upload", error);
    }
  }

  if (shouldUseStreamBindingUpload(env, size)) {
    try {
      return await createStreamBindingUpload(request, env, {
        filename,
        originalName,
        mimeType,
        size,
        uploadedBy,
        uploadMessage,
        takenAt,
      });
    } catch (error) {
      console.warn("Falling back to R2 multipart after Stream binding failed", error);
    }
  }

  return createR2MultipartUpload(request, env, {
    mediaType,
    filename,
    originalName,
    mimeType,
    size,
    uploadedBy,
    uploadMessage,
    takenAt,
  });
}

async function createHostedImageUpload(
  request: Request,
  env: Env,
  input: MediaInsertInput
): Promise<Response> {
  const id = `img-${Date.now()}-${randomId()}`;
  const mediaUrl = imageDeliveryUrl(env, id, publicImageVariant(env));

  await insertMedia(env, {
    ...input,
    id,
    provider: "cloudflare-images-hosted",
    status: "pending",
    providerId: id,
    url: env.IMAGE_DELIVERY_BASE_URL?.trim() ? mediaUrl : undefined,
    thumbnailUrl: env.IMAGE_DELIVERY_BASE_URL?.trim()
      ? imageDeliveryUrl(env, id, thumbImageVariant(env))
      : undefined,
  });

  return json(request, env, {
    id,
    type: "image",
    provider: "cloudflare-images-hosted",
    uploadMethod: "PUT" satisfies UploadMethod,
    uploadProtocol: "form" satisfies UploadProtocol,
    uploadUrl: absoluteUrl(request, `/uploads/images/${encodeURIComponent(id)}`),
    uploadHeaders: {
      "Content-Type": input.mimeType,
    },
    completeUrl: absoluteUrl(request, `/uploads/${encodeURIComponent(id)}/complete`),
  });
}

async function createImageDirectUpload(
  request: Request,
  env: Env,
  input: Omit<MediaInsertInput, "mediaType">
): Promise<Response> {
  const id = `img-${Date.now()}-${randomId()}`;
  const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const formData = new FormData();
  formData.set("id", id);
  formData.set("expiry", expiry);
  if (input.uploadedBy) {
    formData.set("creator", input.uploadedBy);
  }
  formData.set(
    "metadata",
    JSON.stringify({
      filename: input.originalName,
      uploadedBy: input.uploadedBy,
      uploadMessage: input.uploadMessage,
      createdBy: "bryllup-media-worker",
    })
  );

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v2/direct_upload`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
      body: formData,
    }
  );

  const payload = (await response.json()) as {
    success?: boolean;
    errors?: Array<{ message?: string }>;
    result?: { id?: string; uploadURL?: string; uploadUrl?: string };
  };

  if (!response.ok || !payload.success || !payload.result) {
    throw new HttpError(errorMessage(payload.errors, "Could not create Images upload"), 502);
  }

  const imageId = payload.result.id || id;
  const uploadUrl = payload.result.uploadURL || payload.result.uploadUrl;
  if (!uploadUrl) {
    throw new HttpError("Cloudflare Images did not return an upload URL", 502);
  }

  const publicUrl = imageDeliveryUrl(env, imageId, publicImageVariant(env));
  const thumbnailUrl = imageDeliveryUrl(env, imageId, thumbImageVariant(env));

  await insertMedia(env, {
    id: imageId,
    provider: "cloudflare-images",
    mediaType: "image",
    status: "pending",
    filename: input.filename,
    originalName: input.originalName,
    mimeType: input.mimeType,
    size: input.size,
    uploadedBy: input.uploadedBy,
    uploadMessage: input.uploadMessage,
    providerId: imageId,
    url: publicUrl,
    thumbnailUrl,
  });

  return json(request, env, {
    id: imageId,
    type: "image",
    provider: "cloudflare-images",
    uploadMethod: "POST" satisfies UploadMethod,
    uploadProtocol: "form" satisfies UploadProtocol,
    uploadUrl,
    uploadFieldName: "file",
    completeUrl: absoluteUrl(request, `/uploads/${encodeURIComponent(imageId)}/complete`),
  });
}

async function uploadHostedImage(request: Request, env: Env, id: string): Promise<Response> {
  const row = await findMedia(env, id);
  if (!row || row.provider !== "cloudflare-images-hosted") {
    return json(request, env, { error: "Upload target not found" }, 404);
  }

  if (!request.body || !env.IMAGES?.hosted) {
    return json(request, env, { error: "Images binding is not configured" }, 500);
  }

  let image: HostedImageMetadata;
  try {
    image = await env.IMAGES.hosted.upload(request.body, {
      id,
      filename: row.original_name,
      requireSignedURLs: false,
      creator: row.uploaded_by || undefined,
      metadata: {
        mediaId: row.id,
        filename: row.original_name,
        uploadMessage: row.upload_message,
        source: "bryllup-media-worker",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image upload failed";
    const now = new Date().toISOString();
    await env.DB.prepare(
      `UPDATE media
       SET status = 'error', error = ?, updated_at = ?
       WHERE id = ?`
    )
      .bind(message.slice(0, 500), now, id)
      .run();
    throw new HttpError(message, 415);
  }

  const imageId = image.id || id;
  const url = pickHostedImageUrl(env, image, imageId, publicImageVariant(env));
  const thumbnailUrl = pickHostedImageUrl(env, image, imageId, thumbImageVariant(env));
  const now = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE media
     SET status = 'ready', provider_id = ?, url = ?, thumbnail_url = ?,
         uploaded_at = ?, updated_at = ?, error = NULL
     WHERE id = ?`
  )
    .bind(imageId, url, thumbnailUrl, now, now, id)
    .run();

  const updated = await findMedia(env, id);
  return json(request, env, toPublicMedia(updated || row, request), 201);
}

async function createStreamRestUpload(
  request: Request,
  env: Env,
  input: Omit<MediaInsertInput, "mediaType">
): Promise<Response> {
  const basicMaxBytes = parseInteger(
    env.STREAM_BASIC_MAX_BYTES,
    DEFAULT_STREAM_BASIC_MAX_BYTES
  );
  const protocol =
    env.STREAM_UPLOAD_PROTOCOL === "tus" ||
    (env.STREAM_UPLOAD_PROTOCOL !== "form" && input.size > basicMaxBytes)
      ? "tus"
      : "form";

  if (protocol === "tus") {
    return createStreamTusUpload(request, env, input);
  }

  const maxDurationSeconds = parseInteger(
    env.STREAM_MAX_DURATION_SECONDS,
    DEFAULT_STREAM_MAX_DURATION_SECONDS
  );
  const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/direct_upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expiry,
        maxDurationSeconds,
        requireSignedURLs: false,
        meta: {
          name: input.originalName,
          uploadedBy: input.uploadedBy || "",
          uploadMessage: input.uploadMessage || "",
          source: "bryllup-media-worker",
        },
      }),
    }
  );

  const payload = (await response.json()) as {
    success?: boolean;
    errors?: Array<{ message?: string }>;
    result?: { uid?: string; uploadURL?: string; uploadUrl?: string };
  };

  if (!response.ok || !payload.success || !payload.result?.uid) {
    throw new HttpError(errorMessage(payload.errors, "Could not create Stream upload"), 502);
  }

  const streamId = payload.result.uid;
  const uploadUrl = payload.result.uploadURL || payload.result.uploadUrl;
  if (!uploadUrl) {
    throw new HttpError("Cloudflare Stream did not return an upload URL", 502);
  }

  await insertMedia(env, {
    id: streamId,
    provider: "cloudflare-stream",
    mediaType: "video",
    status: "pending",
    filename: input.filename,
    originalName: input.originalName,
    mimeType: input.mimeType,
    size: input.size,
    uploadedBy: input.uploadedBy,
    uploadMessage: input.uploadMessage,
    providerId: streamId,
    url: streamIframeUrl(streamId),
    thumbnailUrl: streamThumbnailUrl(streamId),
  });

  return json(request, env, {
    id: streamId,
    type: "video",
    provider: "cloudflare-stream",
    uploadMethod: "POST" satisfies UploadMethod,
    uploadProtocol: "form" satisfies UploadProtocol,
    uploadUrl,
    uploadFieldName: "file",
    completeUrl: absoluteUrl(request, `/uploads/${encodeURIComponent(streamId)}/complete`),
  });
}

async function createStreamTusUpload(
  request: Request,
  env: Env,
  input: Omit<MediaInsertInput, "mediaType">
): Promise<Response> {
  const maxDurationSeconds = parseInteger(
    env.STREAM_MAX_DURATION_SECONDS,
    DEFAULT_STREAM_MAX_DURATION_SECONDS
  );
  const uploadMetadata = serializeTusMetadata({
    name: input.originalName,
    maxDurationSeconds: String(maxDurationSeconds),
    uploadedBy: input.uploadedBy || "",
    uploadMessage: input.uploadMessage || "",
    source: "bryllup-media-worker",
  });

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "Tus-Resumable": "1.0.0",
        "Upload-Length": String(input.size),
        "Upload-Metadata": uploadMetadata,
      },
    }
  );

  const uploadUrl = response.headers.get("Location");
  if (!response.ok || !uploadUrl) {
    throw new HttpError("Could not create Stream TUS upload", 502);
  }

  const streamId = parseStreamIdFromUploadUrl(uploadUrl) || `stream-${Date.now()}-${randomId()}`;

  await insertMedia(env, {
    id: streamId,
    provider: "cloudflare-stream",
    mediaType: "video",
    status: "pending",
    filename: input.filename,
    originalName: input.originalName,
    mimeType: input.mimeType,
    size: input.size,
    uploadedBy: input.uploadedBy,
    uploadMessage: input.uploadMessage,
    providerId: streamId,
    url: streamIframeUrl(streamId),
    thumbnailUrl: streamThumbnailUrl(streamId),
  });

  return json(request, env, {
    id: streamId,
    type: "video",
    provider: "cloudflare-stream",
    uploadMethod: "PATCH" as UploadMethod,
    uploadProtocol: "tus" satisfies UploadProtocol,
    uploadUrl,
    completeUrl: absoluteUrl(request, `/uploads/${encodeURIComponent(streamId)}/complete`),
  });
}

async function createStreamBindingUpload(
  request: Request,
  env: Env,
  input: Omit<MediaInsertInput, "mediaType">
): Promise<Response> {
  if (!env.STREAM) {
    throw new HttpError("Stream binding is not configured", 500);
  }

  const maxDurationSeconds = parseInteger(
    env.STREAM_MAX_DURATION_SECONDS,
    DEFAULT_STREAM_MAX_DURATION_SECONDS
  );
  const result = await env.STREAM.createDirectUpload({
    maxDurationSeconds,
    meta: {
      name: input.originalName,
      uploadedBy: input.uploadedBy || "",
      uploadMessage: input.uploadMessage || "",
      source: "bryllup-media-worker",
    },
  });
  const streamId = result.id || result.uid;
  if (!streamId) {
    throw new HttpError("Stream did not return an upload ID", 502);
  }

  await insertMedia(env, {
    id: streamId,
    provider: "cloudflare-stream",
    mediaType: "video",
    status: "pending",
    filename: input.filename,
    originalName: input.originalName,
    mimeType: input.mimeType,
    size: input.size,
    uploadedBy: input.uploadedBy,
    uploadMessage: input.uploadMessage,
    providerId: streamId,
    url: streamIframeUrl(streamId),
    thumbnailUrl: streamThumbnailUrl(streamId),
  });

  return json(request, env, {
    id: streamId,
    type: "video",
    provider: "cloudflare-stream",
    uploadMethod: "POST" satisfies UploadMethod,
    uploadProtocol: "form" satisfies UploadProtocol,
    uploadUrl: result.uploadURL,
    uploadFieldName: "file",
    completeUrl: absoluteUrl(request, `/uploads/${encodeURIComponent(streamId)}/complete`),
  });
}

interface MediaInsertInput {
  id?: string;
  provider?: string;
  mediaType: MediaType;
  status?: MediaStatus;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string | null;
  uploadMessage: string | null;
  takenAt?: string | null;
  objectKey?: string;
  providerId?: string;
  url?: string;
  thumbnailUrl?: string;
}

async function createR2Upload(
  request: Request,
  env: Env,
  input: MediaInsertInput
): Promise<Response> {
  const id = `${input.mediaType === "image" ? "img" : "vid"}-${Date.now()}-${randomId()}`;
  const objectKey = `uploads/${input.mediaType}/${id}-${input.filename}`;
  const mediaUrl = absoluteUrl(request, `/media/${encodeURIComponent(id)}/content`);

  await insertMedia(env, {
    ...input,
    id,
    provider: "r2",
    status: "pending",
    objectKey,
    providerId: objectKey,
    url: mediaUrl,
    thumbnailUrl: input.mediaType === "image" ? mediaUrl : undefined,
  });

  return json(request, env, {
    id,
    type: input.mediaType,
    provider: "r2",
    uploadMethod: "PUT" satisfies UploadMethod,
    uploadProtocol: "form" satisfies UploadProtocol,
    uploadUrl: absoluteUrl(request, `/uploads/r2/${encodeURIComponent(id)}`),
    uploadHeaders: {
      "Content-Type": input.mimeType,
    },
    completeUrl: absoluteUrl(request, `/uploads/${encodeURIComponent(id)}/complete`),
  });
}

async function createR2MultipartUpload(
  request: Request,
  env: Env,
  input: MediaInsertInput
): Promise<Response> {
  const id = `${input.mediaType === "image" ? "img" : "vid"}-${Date.now()}-${randomId()}`;
  const objectKey = `uploads/${input.mediaType}/${id}-${input.filename}`;
  const mediaUrl = absoluteUrl(request, `/media/${encodeURIComponent(id)}/content`);
  const partSize = clamp(
    parseInteger(env.R2_MULTIPART_PART_BYTES, DEFAULT_R2_MULTIPART_PART_BYTES),
    5 * 1024 * 1024,
    100 * 1024 * 1024
  );
  const upload = await env.MEDIA_BUCKET.createMultipartUpload(objectKey, {
    httpMetadata: { contentType: input.mimeType },
    customMetadata: {
      originalName: input.originalName,
      mediaId: id,
      uploadMessage: input.uploadMessage || "",
    },
  });

  await insertMedia(env, {
    ...input,
    id,
    provider: "r2-multipart",
    status: "pending",
    objectKey,
    providerId: upload.uploadId,
    url: mediaUrl,
    thumbnailUrl: undefined,
  });

  return json(request, env, {
    id,
    type: input.mediaType,
    provider: "r2-multipart",
    uploadMethod: "PUT" satisfies UploadMethod,
    uploadProtocol: "r2-multipart" satisfies UploadProtocol,
    uploadId: upload.uploadId,
    partSize,
    uploadPartsUrl: absoluteUrl(
      request,
      `/uploads/r2-multipart/${encodeURIComponent(id)}/parts`
    ),
    completeUrl: absoluteUrl(
      request,
      `/uploads/r2-multipart/${encodeURIComponent(id)}/complete`
    ),
    thumbnailUploadUrl:
      input.mediaType === "video"
        ? absoluteUrl(
            request,
            `/uploads/r2-multipart/${encodeURIComponent(id)}/thumbnail`
          )
        : undefined,
    abortUrl: absoluteUrl(request, `/uploads/r2-multipart/${encodeURIComponent(id)}`),
  });
}

async function uploadR2Object(request: Request, env: Env, id: string): Promise<Response> {
  const row = await findMedia(env, id);
  if (!row || row.provider !== "r2" || !row.object_key) {
    return json(request, env, { error: "Upload target not found" }, 404);
  }

  if (!request.body) {
    return json(request, env, { error: "Missing request body" }, 400);
  }

  await env.MEDIA_BUCKET.put(row.object_key, request.body, {
    httpMetadata: { contentType: row.mime_type },
    customMetadata: {
      originalName: row.original_name,
      mediaId: row.id,
      uploadMessage: row.upload_message || "",
    },
  });

  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE media
     SET status = 'ready', uploaded_at = ?, updated_at = ?, error = NULL
     WHERE id = ?`
  )
    .bind(now, now, id)
    .run();

  const updated = await findMedia(env, id);
  return json(request, env, toPublicMedia(updated || row, request), 201);
}

async function uploadR2MultipartPart(
  request: Request,
  env: Env,
  id: string,
  partNumber: number
): Promise<Response> {
  const row = await findMedia(env, id);
  if (
    !row ||
    row.provider !== "r2-multipart" ||
    !row.object_key ||
    !row.provider_id
  ) {
    return json(request, env, { error: "Upload target not found" }, 404);
  }

  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000) {
    return json(request, env, { error: "Invalid part number" }, 400);
  }

  if (!request.body) {
    return json(request, env, { error: "Missing request body" }, 400);
  }

  const upload = env.MEDIA_BUCKET.resumeMultipartUpload(
    row.object_key,
    row.provider_id
  );
  const part = await upload.uploadPart(partNumber, request.body);

  return json(request, env, part);
}

async function completeR2MultipartUpload(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const row = await findMedia(env, id);
  if (
    !row ||
    row.provider !== "r2-multipart" ||
    !row.object_key ||
    !row.provider_id
  ) {
    return json(request, env, { error: "Upload target not found" }, 404);
  }

  if (row.status === "ready") {
    return json(request, env, toPublicMedia(row, request));
  }

  const body = (await request.json()) as { parts?: AppR2UploadedPart[] };
  const parts = (body.parts || [])
    .filter(
      (part) =>
        Number.isInteger(part.partNumber) &&
        part.partNumber > 0 &&
        typeof part.etag === "string" &&
        part.etag.length > 0
    )
    .sort((a, b) => a.partNumber - b.partNumber);

  if (parts.length === 0) {
    return json(request, env, { error: "Missing uploaded parts" }, 400);
  }

  const upload = env.MEDIA_BUCKET.resumeMultipartUpload(
    row.object_key,
    row.provider_id
  );
  await upload.complete(parts);

  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE media
     SET status = 'ready', uploaded_at = ?, updated_at = ?, error = NULL
     WHERE id = ?`
  )
    .bind(now, now, id)
    .run();

  const updated = await findMedia(env, id);
  return json(request, env, toPublicMedia(updated || row, request), 201);
}

async function uploadR2VideoThumbnail(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const row = await findMedia(env, id);
  if (!row || row.provider !== "r2-multipart" || row.media_type !== "video") {
    return json(request, env, { error: "Video upload target not found" }, 404);
  }

  if (!request.body) {
    return json(request, env, { error: "Missing request body" }, 400);
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_VIDEO_THUMBNAIL_BYTES) {
    return json(request, env, { error: "Thumbnail exceeds upload limit" }, 413);
  }

  const thumbnailKey = videoThumbnailKey(id);
  await env.MEDIA_BUCKET.put(thumbnailKey, request.body, {
    httpMetadata: { contentType: "image/jpeg" },
    customMetadata: {
      mediaId: id,
      source: "client-video-thumbnail",
    },
  });

  const thumbnailUrl = absoluteUrl(request, `/media/${encodeURIComponent(id)}/thumbnail`);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE media
     SET thumbnail_url = ?, updated_at = ?
     WHERE id = ?`
  )
    .bind(thumbnailUrl, now, id)
    .run();

  const updated = await findMedia(env, id);
  return json(request, env, toPublicMedia(updated || row, request), 201);
}

async function abortR2MultipartUpload(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const row = await findMedia(env, id);
  if (
    !row ||
    row.provider !== "r2-multipart" ||
    !row.object_key ||
    !row.provider_id
  ) {
    return json(request, env, { error: "Upload target not found" }, 404);
  }

  const upload = env.MEDIA_BUCKET.resumeMultipartUpload(
    row.object_key,
    row.provider_id
  );
  await upload.abort();

  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE media
     SET status = 'error', error = 'Upload aborted', updated_at = ?
     WHERE id = ?`
  )
    .bind(now, id)
    .run();

  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, env),
  });
}

async function completeUpload(request: Request, env: Env, id: string): Promise<Response> {
  const row = await findMedia(env, id);
  if (!row) {
    return json(request, env, { error: "Upload not found" }, 404);
  }

  const now = new Date().toISOString();
  let status: MediaStatus = row.media_type === "video" ? "processing" : "ready";
  let url = row.url;
  let thumbnailUrl = row.thumbnail_url;

  if (row.provider === "cloudflare-stream" && canUseStreamRest(env) && row.provider_id) {
    const streamStatus = await fetchStreamStatus(env, row.provider_id);
    status = streamStatus.readyToStream ? "ready" : "processing";
    url = streamStatus.preview || url || streamIframeUrl(row.provider_id);
    thumbnailUrl = streamStatus.thumbnail || thumbnailUrl || streamThumbnailUrl(row.provider_id);
  }

  await env.DB.prepare(
    `UPDATE media
     SET status = ?, uploaded_at = COALESCE(uploaded_at, ?), updated_at = ?,
         url = COALESCE(?, url), thumbnail_url = COALESCE(?, thumbnail_url), error = NULL
     WHERE id = ?`
  )
    .bind(status, now, now, url, thumbnailUrl, id)
    .run();

  const updated = await findMedia(env, id);
  return json(request, env, toPublicMedia(updated || row, request));
}

async function getPhotoArchive(request: Request, env: Env): Promise<Response> {
  const rangeHeader = request.headers.get("Range");
  const metadata = await env.MEDIA_BUCKET.head(PHOTO_ARCHIVE_KEY);
  if (!metadata || !metadata.size) {
    return json(request, env, { error: "Photo archive is not ready" }, 404);
  }

  const range = parseRangeHeader(rangeHeader, metadata.size);
  const headers = cacheableMediaHeaders(request, env);
  headers.set("Content-Type", "application/zip");
  headers.set(
    "Content-Disposition",
    `attachment; filename="${PHOTO_ARCHIVE_FILENAME}"`
  );
  headers.set("Cache-Control", PHOTO_ARCHIVE_CACHE_CONTROL);
  headers.set("Accept-Ranges", "bytes");
  headers.set(
    "Content-Length",
    String(range ? range.end - range.start + 1 : metadata.size)
  );
  if (metadata.httpEtag) {
    headers.set("ETag", metadata.httpEtag);
  }
  if (range) {
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${metadata.size}`);
  }

  if (request.method === "HEAD") {
    return new Response(null, { headers });
  }

  const object = await env.MEDIA_BUCKET.get(
    PHOTO_ARCHIVE_KEY,
    range
      ? {
          range: {
            offset: range.start,
            length: range.end - range.start + 1,
          },
        }
      : undefined
  );
  if (!object?.body) {
    return json(request, env, { error: "Photo archive is not ready" }, 404);
  }

  return new Response(object.body, { status: range ? 206 : 200, headers });
}

async function createPhotoArchiveUpload(request: Request, env: Env): Promise<Response> {
  const upload = await env.MEDIA_BUCKET.createMultipartUpload(PHOTO_ARCHIVE_KEY, {
    httpMetadata: {
      contentType: "application/zip",
      contentDisposition: `attachment; filename="${PHOTO_ARCHIVE_FILENAME}"`,
      cacheControl: PHOTO_ARCHIVE_CACHE_CONTROL,
    },
    customMetadata: {
      source: "bryllup-photo-archive",
    },
  });

  const uploadId = encodeURIComponent(upload.uploadId);
  return json(request, env, {
    uploadId: upload.uploadId,
    partSize: PHOTO_ARCHIVE_PART_BYTES,
    uploadPartsUrl: absoluteUrl(request, "/downloads/photos.zip/upload/parts"),
    completeUrl: absoluteUrl(
      request,
      `/downloads/photos.zip/upload/complete?uploadId=${uploadId}`
    ),
    abortUrl: absoluteUrl(
      request,
      `/downloads/photos.zip/upload?uploadId=${uploadId}`
    ),
  });
}

async function uploadPhotoArchivePart(
  request: Request,
  env: Env,
  partNumber: number
): Promise<Response> {
  const uploadId = requiredUploadId(request);
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000) {
    return json(request, env, { error: "Invalid part number" }, 400);
  }
  if (!request.body) {
    return json(request, env, { error: "Missing request body" }, 400);
  }

  const upload = env.MEDIA_BUCKET.resumeMultipartUpload(PHOTO_ARCHIVE_KEY, uploadId);
  const part = await upload.uploadPart(partNumber, request.body);
  return json(request, env, part);
}

async function completePhotoArchiveUpload(request: Request, env: Env): Promise<Response> {
  const uploadId = requiredUploadId(request);
  const body = (await request.json()) as { parts?: AppR2UploadedPart[] };
  const parts = (body.parts || [])
    .filter(
      (part) =>
        Number.isInteger(part.partNumber) &&
        part.partNumber > 0 &&
        typeof part.etag === "string" &&
        part.etag.length > 0
    )
    .sort((a, b) => a.partNumber - b.partNumber);

  if (parts.length === 0) {
    return json(request, env, { error: "Missing uploaded parts" }, 400);
  }

  const upload = env.MEDIA_BUCKET.resumeMultipartUpload(PHOTO_ARCHIVE_KEY, uploadId);
  const object = await upload.complete(parts);
  return json(request, env, {
    ok: true,
    key: object.key || PHOTO_ARCHIVE_KEY,
    downloadUrl: absoluteUrl(request, "/downloads/photos.zip"),
  });
}

async function abortPhotoArchiveUpload(request: Request, env: Env): Promise<Response> {
  const uploadId = requiredUploadId(request);
  const upload = env.MEDIA_BUCKET.resumeMultipartUpload(PHOTO_ARCHIVE_KEY, uploadId);
  await upload.abort();
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

async function listStreamMigrations(request: Request, env: Env): Promise<Response> {
  const rows = (
    await env.DB.prepare(
      `SELECT
         m.id, m.original_name, m.size, m.provider, m.status AS media_status,
         sm.stream_id, sm.status AS migration_status, sm.error, sm.updated_at
       FROM media m
       LEFT JOIN stream_migrations sm ON sm.media_id = m.id
       WHERE m.media_type = 'video' AND m.status = 'ready'
       ORDER BY m.created_at, m.id`
    ).all<{
      id: string;
      original_name: string;
      size: number;
      provider: string;
      media_status: string;
      stream_id: string | null;
      migration_status: string | null;
      error: string | null;
      updated_at: string | null;
    }>()
  ).results;

  return json(request, env, {
    videos: rows.map((row) => ({
      id: row.id,
      originalName: row.original_name,
      size: row.size,
      provider: row.provider,
      mediaStatus: row.media_status,
      streamId: row.stream_id || undefined,
      migrationStatus: row.migration_status || "not-started",
      error: row.error || undefined,
      updatedAt: row.updated_at || undefined,
    })),
  });
}

async function startStreamMigration(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  if (!env.STREAM) {
    throw new HttpError("Stream binding is not configured", 503);
  }

  const row = await findMedia(env, id);
  if (!row || row.media_type !== "video" || !row.object_key) {
    return json(request, env, { error: "R2 video not found" }, 404);
  }

  const existing = await findStreamMigration(env, id);
  if (existing) {
    return json(request, env, streamMigrationJson(existing));
  }

  const sourceUrl = absoluteUrl(request, `/media/${encodeURIComponent(id)}/content`);
  let video: AppStreamVideo;
  try {
    video = await env.STREAM.upload(sourceUrl, {
      creator: "bryllup-migration",
      meta: {
        mediaId: row.id,
        name: row.original_name,
        source: "bryllup-r2",
      },
      requireSignedURLs: false,
      thumbnailTimestampPct: 0.1,
    });
  } catch (error) {
    if (errorName(error) === "AlreadyUploadedError") {
      const videos = await env.STREAM.videos.list({ limit: 1000 });
      const recovered = videos.find((candidate) => candidate.meta.mediaId === row.id);
      if (!recovered) {
        throw new HttpError(
          "Stream reported a duplicate upload, but the existing video could not be found",
          502
        );
      }
      video = recovered;
    } else {
      const message = unknownErrorMessage(error);
      if (/quota|storage|capacity|allocated|minutes/i.test(message)) {
        throw new HttpError(message, 409);
      }
      throw new HttpError(`Stream upload failed: ${message}`, 502);
    }
  }

  if (!video.id) {
    throw new HttpError("Stream did not return a video ID", 502);
  }

  const now = new Date().toISOString();
  const migrationStatus = video.readyToStream ? "ready-to-finalize" : "processing";
  await env.DB.prepare(
    `INSERT INTO stream_migrations (
       media_id, stream_id, source_provider, source_object_key,
       status, error, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`
  )
    .bind(
      row.id,
      video.id,
      row.provider,
      row.object_key,
      migrationStatus,
      now,
      now
    )
    .run();

  const migration = await findStreamMigration(env, id);
  return json(
    request,
    env,
    migration ? streamMigrationJson(migration) : { error: "Migration was not saved" },
    202
  );
}

async function finalizeStreamMigration(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  if (!env.STREAM) {
    throw new HttpError("Stream binding is not configured", 503);
  }

  const migration = await findStreamMigration(env, id);
  if (!migration) {
    return json(request, env, { error: "Stream migration not found" }, 404);
  }

  const video = await env.STREAM.video(migration.stream_id).details();
  const now = new Date().toISOString();
  const streamState = video.status.state.toLowerCase();
  const failed = streamState === "error" || Boolean(video.status.errorReasonCode);

  if (failed) {
    const message =
      video.status.errorReasonText || video.status.errorReasonCode || "Stream processing failed";
    await env.DB.prepare(
      `UPDATE stream_migrations SET status = 'error', error = ?, updated_at = ?
       WHERE media_id = ?`
    )
      .bind(message, now, id)
      .run();
    return json(request, env, { error: message, streamId: migration.stream_id }, 422);
  }

  if (!video.readyToStream) {
    await env.DB.prepare(
      `UPDATE stream_migrations SET status = 'processing', error = NULL, updated_at = ?
       WHERE media_id = ?`
    )
      .bind(now, id)
      .run();
    return json(
      request,
      env,
      {
        mediaId: id,
        streamId: migration.stream_id,
        status: "processing",
        streamState: video.status.state,
      },
      202
    );
  }

  await env.DB.prepare(
    `UPDATE media
     SET provider = 'cloudflare-stream', provider_id = ?, url = ?, thumbnail_url = ?,
         status = 'ready', error = NULL, updated_at = ?
     WHERE id = ?`
  )
    .bind(
      migration.stream_id,
      streamIframeUrl(migration.stream_id),
      video.thumbnail || streamThumbnailUrl(migration.stream_id),
      now,
      id
    )
    .run();

  await env.DB.prepare(
    `UPDATE stream_migrations SET status = 'complete', error = NULL, updated_at = ?
     WHERE media_id = ?`
  )
    .bind(now, id)
    .run();

  const updated = await findMedia(env, id);
  return json(request, env, {
    mediaId: id,
    streamId: migration.stream_id,
    status: "complete",
    video: updated ? toPublicMedia(updated, request) : undefined,
  });
}

async function findStreamMigration(
  env: Env,
  mediaId: string
): Promise<StreamMigrationRow | null> {
  return env.DB.prepare("SELECT * FROM stream_migrations WHERE media_id = ?")
    .bind(mediaId)
    .first<StreamMigrationRow>();
}

function streamMigrationJson(row: StreamMigrationRow) {
  return {
    mediaId: row.media_id,
    streamId: row.stream_id,
    status: row.status,
    error: row.error || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function errorName(error: unknown): string {
  if (error instanceof Error) return error.name;
  if (typeof error === "object" && error !== null && "name" in error) {
    return String(error.name);
  }
  return "";
}

function unknownErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }
  if (typeof error === "string") return error;
  return "Unexpected error";
}

function requiredUploadId(request: Request): string {
  const uploadId = new URL(request.url).searchParams.get("uploadId");
  if (!uploadId) {
    throw new HttpError("Missing upload ID", 400);
  }
  return uploadId;
}

async function getR2Content(
  request: Request,
  env: Env,
  id: string,
  ctx?: AppExecutionContext,
  disposition: "inline" | "attachment" = "inline"
): Promise<Response> {
  const row = await findMedia(env, id);
  if (!row || !row.object_key) {
    return json(request, env, { error: "Media not found" }, 404);
  }

  const range = parseRangeHeader(request.headers.get("Range"), row.size);
  const shouldCacheWholeImage = row.media_type === "image" && !range;
  if (shouldCacheWholeImage) {
    const cached = await matchImmutableMediaCache(request);
    if (cached) {
      return cached;
    }
  }

  const object = await env.MEDIA_BUCKET.get(
    row.object_key,
    range
      ? {
          range: {
            offset: range.start,
            length: range.end - range.start + 1,
          },
        }
      : undefined
  );
  if (!object || !object.body) {
    return json(request, env, { error: "Object not found" }, 404);
  }

  const headers = shouldCacheWholeImage
    ? cacheableMediaHeaders(request, env)
    : corsHeaders(request, env);
  headers.set("Content-Type", row.mime_type);
  headers.set("Cache-Control", IMMUTABLE_MEDIA_CACHE_CONTROL);
  if (shouldCacheWholeImage) {
    headers.set("X-Bryllup-Cache", "MISS");
  }
  headers.set(
    "Content-Disposition",
    `${disposition}; filename="${sanitizeDownloadFilename(row.original_name || row.filename)}"`
  );
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Length", String(range ? range.end - range.start + 1 : row.size));
  if (range) {
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${row.size}`);
  }
  if (object.httpEtag) {
    headers.set("ETag", object.httpEtag);
  }

  const response = new Response(object.body, { status: range ? 206 : 200, headers });
  if (shouldCacheWholeImage) {
    cacheImmutableMediaResponse(request, response, ctx);
  }

  return response;
}

async function getR2Thumbnail(
  request: Request,
  env: Env,
  id: string,
  ctx?: AppExecutionContext
): Promise<Response> {
  const row = await findMedia(env, id);
  if (!row) {
    return json(request, env, { error: "Thumbnail not found" }, 404);
  }

  if (row.media_type === "image") {
    return getR2ImageVariant(request, env, id, "thumbnail", ctx, row);
  }

  if (!row.thumbnail_url) {
    return json(request, env, { error: "Thumbnail not found" }, 404);
  }

  const cached = await matchImmutableMediaCache(request);
  if (cached) {
    return cached;
  }

  const object = await env.MEDIA_BUCKET.get(videoThumbnailKey(id));
  if (!object || !object.body) {
    return json(request, env, { error: "Thumbnail object not found" }, 404);
  }

  const headers = cacheableMediaHeaders(request, env);
  headers.set("Content-Type", "image/jpeg");
  headers.set("Cache-Control", IMMUTABLE_MEDIA_CACHE_CONTROL);
  headers.set("X-Bryllup-Cache", "MISS");
  if (object.size) {
    headers.set("Content-Length", String(object.size));
  }
  if (object.httpEtag) {
    headers.set("ETag", object.httpEtag);
  }

  const response = new Response(object.body, { headers });
  cacheImmutableMediaResponse(request, response, ctx);
  return response;
}

async function getR2ImageVariant(
  request: Request,
  env: Env,
  id: string,
  variant: "thumbnail" | "preview",
  ctx?: AppExecutionContext,
  knownRow?: MediaRow
): Promise<Response> {
  const cached = await matchImmutableMediaCache(request);
  if (cached) {
    return cached;
  }

  const row = knownRow || (await findMedia(env, id));
  if (
    !row ||
    row.media_type !== "image" ||
    !isR2Provider(row.provider) ||
    !row.object_key ||
    !env.IMAGES
  ) {
    return json(request, env, { error: "Image variant is not available" }, 404);
  }

  const object = await env.MEDIA_BUCKET.get(row.object_key);
  if (!object?.body) {
    return json(request, env, { error: "Image not found" }, 404);
  }

  const transformer = env.IMAGES.input(object.body);
  const transformed =
    variant === "thumbnail"
      ? await transformer
          .transform({
            width: 480,
            height: 480,
            fit: "cover",
            gravity: "auto",
          })
          .output({ format: "image/webp", quality: 72, anim: false })
      : await transformer
          .transform({
            width: 1600,
            height: 1600,
            fit: "scale-down",
          })
          .output({ format: "image/webp", quality: 82, anim: false });

  const imageResponse = transformed.response();
  const headers = cacheableMediaHeaders(request, env);
  headers.set("Content-Type", imageResponse.headers.get("Content-Type") || "image/webp");
  headers.set("Cache-Control", IMMUTABLE_MEDIA_CACHE_CONTROL);
  headers.set("X-Bryllup-Cache", "MISS");
  const contentLength = imageResponse.headers.get("Content-Length");
  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }

  const response = new Response(imageResponse.body, { headers });
  cacheImmutableMediaResponse(request, response, ctx);
  return response;
}

async function insertMedia(env: Env, input: MediaInsertInput): Promise<void> {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO media (
      id, provider, media_type, status, filename, original_name, mime_type, size,
      uploaded_by, upload_message, object_key, provider_id, url, thumbnail_url, taken_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      input.id,
      input.provider || "r2",
      input.mediaType,
      input.status || "pending",
      input.filename,
      input.originalName,
      input.mimeType,
      input.size,
      input.uploadedBy,
      input.uploadMessage,
      input.objectKey || null,
      input.providerId || null,
      input.url || null,
      input.thumbnailUrl || null,
      input.takenAt || null,
      now,
      now
    )
    .run();
}

async function findMedia(env: Env, id: string): Promise<MediaRow | null> {
  return env.DB.prepare("SELECT * FROM media WHERE id = ?").bind(id).first<MediaRow>();
}

async function fetchStreamStatus(
  env: Env,
  streamId: string
): Promise<{ readyToStream: boolean; preview?: string; thumbnail?: string }> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/${streamId}`,
    {
      headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
    }
  );

  if (!response.ok) {
    return { readyToStream: false };
  }

  const payload = (await response.json()) as {
    result?: {
      readyToStream?: boolean;
      preview?: string;
      thumbnail?: string;
    };
  };

  return {
    readyToStream: Boolean(payload.result?.readyToStream),
    preview: payload.result?.preview,
    thumbnail: payload.result?.thumbnail,
  };
}

function toPublicMedia(row: MediaRow, request: Request) {
  const isR2 = isR2Provider(row.provider);
  const hasR2Original = Boolean(row.object_key);
  const encodedId = encodeURIComponent(row.id);
  const r2Url = isR2
    ? absoluteUrl(request, `/media/${encodedId}/content`)
    : null;
  const r2DownloadUrl = hasR2Original
    ? absoluteUrl(request, `/media/${encodedId}/download`)
    : null;
  const r2ThumbnailUrl =
    isR2 && row.media_type === "image"
      ? absoluteUrl(request, `/media/${encodedId}/thumbnail`)
      : null;
  const r2PreviewUrl =
    isR2 && row.media_type === "image"
      ? absoluteUrl(request, `/media/${encodedId}/preview`)
      : null;

  return {
    id: row.id,
    filename: row.filename,
    originalName: row.original_name,
    mimeType: row.mime_type,
    mediaType: row.media_type,
    provider: row.provider,
    status: row.status,
    size: row.size,
    takenAt: row.taken_at || undefined,
    uploadedAt: row.uploaded_at || row.created_at,
    uploadedBy: row.uploaded_by || undefined,
    uploadMessage: row.upload_message || undefined,
    url: row.url || r2Url,
    downloadUrl: r2DownloadUrl || row.url || undefined,
    previewUrl: r2PreviewUrl || (row.media_type === "image" ? row.url || undefined : undefined),
    thumbnailUrl:
      r2ThumbnailUrl ||
      row.thumbnail_url ||
      (row.media_type === "image" ? row.url || r2Url : undefined),
  };
}

function isR2Provider(provider: string): boolean {
  return provider === "r2" || provider === "r2-multipart";
}

function videoThumbnailKey(id: string): string {
  return `thumbnails/video/${id}.jpg`;
}

function parseRangeHeader(
  header: string | null,
  size: number
): { start: number; end: number } | null {
  if (!header || !header.startsWith("bytes=") || size <= 0) {
    return null;
  }

  const [startRaw, endRaw] = header.replace("bytes=", "").split("-", 2);
  if (!startRaw && !endRaw) {
    return null;
  }

  if (!startRaw && endRaw) {
    const suffix = Number.parseInt(endRaw, 10);
    if (!Number.isFinite(suffix) || suffix <= 0) {
      return null;
    }
    const start = Math.max(size - suffix, 0);
    return { start, end: size - 1 };
  }

  const start = Number.parseInt(startRaw, 10);
  const end = endRaw ? Number.parseInt(endRaw, 10) : size - 1;

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end < start ||
    start >= size
  ) {
    return null;
  }

  return { start, end: Math.min(end, size - 1) };
}

function detectMediaType(mimeType: string): MediaType | null {
  if (IMAGE_TYPES.has(mimeType) || mimeType.startsWith("image/")) {
    return "image";
  }

  if (VIDEO_TYPES.has(mimeType) || mimeType.startsWith("video/")) {
    return "video";
  }

  return null;
}

function sanitizeFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop()?.trim() || "";
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return safe.slice(0, 160) || `upload-${Date.now()}`;
}

function sanitizeDownloadFilename(filename: string): string {
  return filename
    .replace(/[\r\n"\\/]/g, "_")
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .slice(0, 180);
}

function sanitizeOptionalText(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

function canUseCloudflareImages(env: Env): boolean {
  return Boolean(
    env.CLOUDFLARE_ACCOUNT_ID &&
      env.CLOUDFLARE_API_TOKEN &&
      env.IMAGE_DELIVERY_BASE_URL?.trim()
  );
}

function canUseHostedImages(env: Env): boolean {
  return Boolean(env.IMAGES?.hosted);
}

function imageUploadProvider(
  env: Env
): "auto" | "r2" | "cloudflare-images" | "cloudflare-images-hosted" {
  const provider = env.IMAGE_UPLOAD_PROVIDER?.trim().toLowerCase();

  if (provider === "r2") {
    return "r2";
  }

  if (provider === "cloudflare-images" || provider === "images") {
    return "cloudflare-images";
  }

  if (provider === "cloudflare-images-hosted" || provider === "images-hosted") {
    return "cloudflare-images-hosted";
  }

  return "auto";
}

function canUseStreamRest(env: Env): boolean {
  return Boolean(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN);
}

function shouldUseStreamBindingUpload(env: Env, size: number): boolean {
  if (!env.STREAM || env.STREAM_UPLOAD_PROTOCOL === "r2-multipart") {
    return false;
  }

  if (env.STREAM_UPLOAD_PROTOCOL === "form") {
    return true;
  }

  const basicMaxBytes = parseInteger(
    env.STREAM_BASIC_MAX_BYTES,
    DEFAULT_STREAM_BASIC_MAX_BYTES
  );
  return size <= basicMaxBytes;
}

function pickHostedImageUrl(
  env: Env,
  image: HostedImageMetadata,
  id: string,
  preferredVariant: string
): string {
  const preferred = image.variants?.find((variant) => variant.endsWith(`/${preferredVariant}`));
  if (preferred) {
    return preferred;
  }

  if (image.variants?.[0]) {
    return image.variants[0];
  }

  return imageDeliveryUrl(env, id, preferredVariant);
}

function imageDeliveryUrl(env: Env, id: string, variant: string): string {
  return `${env.IMAGE_DELIVERY_BASE_URL?.replace(/\/$/, "")}/${id}/${variant}`;
}

function publicImageVariant(env: Env): string {
  return env.IMAGE_VARIANT_PUBLIC || "public";
}

function thumbImageVariant(env: Env): string {
  return env.IMAGE_VARIANT_THUMB || publicImageVariant(env);
}

function streamIframeUrl(id: string): string {
  return `https://iframe.videodelivery.net/${id}`;
}

function streamThumbnailUrl(id: string): string {
  return `https://videodelivery.net/${id}/thumbnails/thumbnail.jpg`;
}

function serializeTusMetadata(values: Record<string, string>): string {
  return Object.entries(values)
    .filter(([, value]) => value.length > 0)
    .map(([key, value]) => `${key} ${base64Utf8(value)}`)
    .join(",");
}

function base64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function parseStreamIdFromUploadUrl(uploadUrl: string): string | null {
  try {
    const url = new URL(uploadUrl);
    const candidate = url.pathname.split("/").filter(Boolean).pop();
    return candidate || null;
  } catch {
    return null;
  }
}

function absoluteUrl(request: Request, path: string): string {
  const url = new URL(request.url);
  return `${url.origin}${path}`;
}

function trimTrailingSlash(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
}

function parseOptionalIsoDate(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function encodeMediaCursor(row: MediaRow | undefined): string | undefined {
  if (!row) {
    return undefined;
  }

  const sortAt = row.sort_at || row.taken_at || row.uploaded_at || row.created_at;
  return `${sortAt}|${row.created_at}|${row.id}`;
}

function parseMediaCursor(value: string | null): MediaCursor | null {
  if (!value) {
    return null;
  }

  const [sortAt, createdAt, id] = value.split("|", 3);
  if (!sortAt || !createdAt || !id) {
    return null;
  }

  return { sortAt, createdAt, id };
}

function parseInteger(value: string | null | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function randomId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function requireUploadToken(request: Request, env: Env): void {
  if (!env.UPLOAD_TOKEN) {
    return;
  }

  if (request.headers.get("X-Upload-Token") !== env.UPLOAD_TOKEN) {
    throw new HttpError("Invalid upload token", 401);
  }
}

function requirePhotoArchiveUploadToken(request: Request, env: Env): void {
  const token = env.ARCHIVE_UPLOAD_TOKEN || env.UPLOAD_TOKEN;
  if (!token) {
    throw new HttpError("Archive upload is not configured", 503);
  }
  if (request.headers.get("X-Upload-Token") !== token) {
    throw new HttpError("Unauthorized", 401);
  }
}

async function requireMigrationToken(request: Request, env: Env): Promise<void> {
  if (!env.MIGRATION_TOKEN) {
    throw new HttpError("Stream migration is not configured", 503);
  }

  const provided = request.headers.get("X-Upload-Token") || "";
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(env.MIGRATION_TOKEN)),
  ]);
  const subtle = crypto.subtle as AppSubtleCrypto;
  if (!subtle.timingSafeEqual(providedHash, expectedHash)) {
    throw new HttpError("Unauthorized", 401);
  }
}

function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers();
  const origin = request.headers.get("Origin");
  const configured = env.CORS_ORIGINS?.split(",").map((item) => item.trim()).filter(Boolean);
  const allowAny = !configured?.length || configured.includes("*");

  if (allowAny) {
    headers.set("Access-Control-Allow-Origin", origin || "*");
  } else if (origin && configured.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Upload-Token, Tus-Resumable, Upload-Length, Upload-Metadata, Upload-Offset"
  );
  headers.set(
    "Access-Control-Expose-Headers",
    "Location, Upload-Offset, Content-Length, Content-Range, Accept-Ranges"
  );
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}

function cacheableMediaHeaders(request: Request, env: Env): Headers {
  const headers = corsHeaders(request, env);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.delete("Vary");
  return headers;
}

async function matchImmutableMediaCache(request: Request): Promise<Response | null> {
  const cache = immutableMediaCache();
  const cached = await cache.match(immutableMediaCacheKey(request));
  if (!cached) {
    return null;
  }

  const headers = new Headers(cached.headers);
  headers.set("X-Bryllup-Cache", "HIT");
  return new Response(cached.body, {
    status: cached.status,
    statusText: cached.statusText,
    headers,
  });
}

function cacheImmutableMediaResponse(
  request: Request,
  response: Response,
  ctx?: AppExecutionContext
): void {
  if (response.status < 200 || response.status >= 300) {
    return;
  }

  const cache = immutableMediaCache();
  const put = cache
    .put(immutableMediaCacheKey(request), response.clone())
    .catch((error) => console.warn("Could not cache media response", error));
  if (ctx) {
    ctx.waitUntil(put);
  }
}

function immutableMediaCache(): Cache {
  return (caches as CacheStorage & { default: Cache }).default;
}

function immutableMediaCacheKey(request: Request): Request {
  return new Request(request.url, { method: "GET" });
}

function json(
  request: Request,
  env: Env,
  payload: unknown,
  status = 200
): Response {
  const headers = corsHeaders(request, env);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(payload), { status, headers });
}

function errorMessage(
  errors: Array<{ message?: string }> | undefined,
  fallback: string
): string {
  return errors?.map((error) => error.message).filter(Boolean).join("; ") || fallback;
}

class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}
