// Photo metadata returned from storage
export interface PhotoMetadata {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  mediaType?: "image" | "video";
  provider?: string;
  status?: "pending" | "processing" | "ready" | "error";
  size: number;
  takenAt?: Date | string;
  uploadedAt: Date | string;
  uploadedBy?: string;
  uploadMessage?: string;
  url: string;
  downloadUrl?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
}

// Input for uploading a photo
export interface UploadInput {
  file: Buffer | Blob | ArrayBuffer;
  filename: string;
  mimeType: string;
  uploadedBy?: string;
  uploadMessage?: string;
}

// Result of an upload operation
export interface UploadResult {
  success: boolean;
  photo?: PhotoMetadata;
  error?: string;
}

// Options for listing photos
export interface ListOptions {
  limit?: number;
  cursor?: string;
  sortBy?: "uploadedAt" | "filename";
  sortOrder?: "asc" | "desc";
}

// Result of listing photos with pagination
export interface ListResult {
  photos: PhotoMetadata[];
  nextCursor?: string;
  hasMore: boolean;
}

// Storage provider interface - implement this for each storage backend
export interface StorageProvider {
  upload(input: UploadInput): Promise<UploadResult>;
  list(options?: ListOptions): Promise<ListResult>;
  get(id: string): Promise<PhotoMetadata | null>;
  delete(id: string): Promise<boolean>;
  getThumbnailUrl?(id: string, width: number, height: number): string;
}

// Available storage provider types
export type StorageProviderType = "vercel-blob" | "google-drive";
