import { put, list, del, head } from "@vercel/blob";
import type {
  StorageProvider,
  PhotoMetadata,
  UploadInput,
  UploadResult,
  ListOptions,
  ListResult,
} from "./types";

export class VercelBlobStorage implements StorageProvider {
  async upload(input: UploadInput): Promise<UploadResult> {
    try {
      const timestamp = Date.now();
      const safeName = input.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      const pathname = `photos/${timestamp}-${safeName}`;

      const blob = await put(pathname, input.file, {
        access: "public",
        contentType: input.mimeType,
        addRandomSuffix: false,
      });

      const photo: PhotoMetadata = {
        id: blob.pathname,
        filename: blob.pathname.split("/").pop() || safeName,
        originalName: input.filename,
        mimeType: input.mimeType,
        size: 0,
        uploadedAt: new Date(),
        uploadedBy: input.uploadedBy,
        url: blob.url,
        thumbnailUrl: `${blob.url}?w=400&q=75`,
      };

      return { success: true, photo };
    } catch (error) {
      console.error("Vercel Blob upload error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  async list(options?: ListOptions): Promise<ListResult> {
    try {
      const response = await list({
        prefix: "photos/",
        limit: options?.limit || 50,
        cursor: options?.cursor,
      });

      const photos: PhotoMetadata[] = response.blobs.map((blob) => ({
        id: blob.pathname,
        filename: blob.pathname.split("/").pop() || "",
        originalName: blob.pathname.split("/").pop() || "",
        mimeType: "image/jpeg",
        size: blob.size,
        uploadedAt: new Date(blob.uploadedAt),
        url: blob.url,
        thumbnailUrl: `${blob.url}?w=400&q=75`,
      }));

      return {
        photos,
        nextCursor: response.cursor || undefined,
        hasMore: response.hasMore,
      };
    } catch (error) {
      console.error("Vercel Blob list error:", error);
      return { photos: [], hasMore: false };
    }
  }

  async get(id: string): Promise<PhotoMetadata | null> {
    try {
      const blob = await head(id);
      return {
        id: blob.pathname,
        filename: blob.pathname.split("/").pop() || "",
        originalName: blob.pathname.split("/").pop() || "",
        mimeType: blob.contentType,
        size: blob.size,
        uploadedAt: new Date(blob.uploadedAt),
        url: blob.url,
        thumbnailUrl: `${blob.url}?w=400&q=75`,
      };
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await del(id);
      return true;
    } catch {
      return false;
    }
  }

  getThumbnailUrl(url: string, width: number, height: number): string {
    return `${url}?w=${width}&h=${height}&fit=cover&q=75`;
  }
}
