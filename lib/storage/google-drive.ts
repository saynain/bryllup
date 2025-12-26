import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";
import type {
  StorageProvider,
  PhotoMetadata,
  UploadInput,
  UploadResult,
  ListOptions,
  ListResult,
} from "./types";

export class GoogleDriveStorage implements StorageProvider {
  private drive: drive_v3.Drive;
  private folderId: string;

  constructor() {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!serviceAccountEmail || !privateKey || !folderId) {
      throw new Error("Missing Google Drive configuration");
    }

    this.folderId = folderId;

    // Format private key (handle escaped newlines)
    let formattedKey = privateKey;
    if (formattedKey.includes("\\n")) {
      formattedKey = formattedKey.replace(/\\n/g, "\n");
    }
    formattedKey = formattedKey.replace(/^["']|["']$/g, "");

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccountEmail,
        private_key: formattedKey,
      },
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    this.drive = google.drive({ version: "v3", auth });
  }

  private bufferToStream(buffer: Buffer | ArrayBuffer): Readable {
    const readable = new Readable();
    const nodeBuffer = buffer instanceof ArrayBuffer
      ? Buffer.from(new Uint8Array(buffer))
      : buffer;
    readable.push(nodeBuffer);
    readable.push(null);
    return readable;
  }

  async upload(input: UploadInput): Promise<UploadResult> {
    try {
      const timestamp = Date.now();
      const safeName = input.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileName = `${timestamp}-${safeName}`;

      let buffer: Buffer;
      if (input.file instanceof Blob) {
        buffer = Buffer.from(new Uint8Array(await input.file.arrayBuffer()));
      } else if (input.file instanceof ArrayBuffer) {
        buffer = Buffer.from(new Uint8Array(input.file));
      } else {
        buffer = input.file as Buffer;
      }

      const response = await this.drive.files.create({
        requestBody: {
          name: fileName,
          parents: [this.folderId],
          description: input.uploadedBy
            ? `Uploaded by: ${input.uploadedBy}`
            : undefined,
        },
        media: {
          mimeType: input.mimeType,
          body: this.bufferToStream(buffer),
        },
        fields: "id, name, mimeType, size, createdTime, thumbnailLink",
      });

      const file = response.data;

      // Make file publicly viewable
      await this.drive.permissions.create({
        fileId: file.id!,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });

      const photo: PhotoMetadata = {
        id: file.id!,
        filename: file.name!,
        originalName: input.filename,
        mimeType: file.mimeType!,
        size: parseInt(file.size || "0"),
        uploadedAt: new Date(file.createdTime!),
        uploadedBy: input.uploadedBy,
        url: `https://drive.google.com/uc?export=view&id=${file.id}`,
        thumbnailUrl:
          file.thumbnailLink ||
          `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`,
      };

      return { success: true, photo };
    } catch (error) {
      console.error("Google Drive upload error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  async list(options?: ListOptions): Promise<ListResult> {
    try {
      const response = await this.drive.files.list({
        q: `'${this.folderId}' in parents and mimeType contains 'image/' and trashed = false`,
        pageSize: options?.limit || 50,
        pageToken: options?.cursor,
        orderBy: "createdTime desc",
        fields:
          "nextPageToken, files(id, name, mimeType, size, createdTime, thumbnailLink, description)",
      });

      const photos: PhotoMetadata[] = (response.data.files || []).map(
        (file) => {
          // Extract uploadedBy from description if present
          const uploadedByMatch = file.description?.match(
            /Uploaded by: (.+)/
          );
          return {
            id: file.id!,
            filename: file.name!,
            originalName: file.name!,
            mimeType: file.mimeType!,
            size: parseInt(file.size || "0"),
            uploadedAt: new Date(file.createdTime!),
            uploadedBy: uploadedByMatch?.[1],
            url: `https://drive.google.com/uc?export=view&id=${file.id}`,
            thumbnailUrl:
              file.thumbnailLink ||
              `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`,
          };
        }
      );

      return {
        photos,
        nextCursor: response.data.nextPageToken || undefined,
        hasMore: !!response.data.nextPageToken,
      };
    } catch (error) {
      console.error("Google Drive list error:", error);
      return { photos: [], hasMore: false };
    }
  }

  async get(id: string): Promise<PhotoMetadata | null> {
    try {
      const response = await this.drive.files.get({
        fileId: id,
        fields: "id, name, mimeType, size, createdTime, thumbnailLink, description",
      });

      const file = response.data;
      const uploadedByMatch = file.description?.match(/Uploaded by: (.+)/);

      return {
        id: file.id!,
        filename: file.name!,
        originalName: file.name!,
        mimeType: file.mimeType!,
        size: parseInt(file.size || "0"),
        uploadedAt: new Date(file.createdTime!),
        uploadedBy: uploadedByMatch?.[1],
        url: `https://drive.google.com/uc?export=view&id=${file.id}`,
        thumbnailUrl:
          file.thumbnailLink ||
          `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`,
      };
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.drive.files.delete({ fileId: id });
      return true;
    } catch {
      return false;
    }
  }

  getThumbnailUrl(id: string, width: number): string {
    return `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;
  }
}
