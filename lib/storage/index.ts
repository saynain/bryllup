import type { StorageProvider, StorageProviderType } from "./types";
import { VercelBlobStorage } from "./vercel-blob";
import { GoogleDriveStorage } from "./google-drive";

let storageInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (storageInstance) {
    return storageInstance;
  }

  const providerType = (process.env.STORAGE_PROVIDER ||
    "vercel-blob") as StorageProviderType;

  switch (providerType) {
    case "vercel-blob":
      storageInstance = new VercelBlobStorage();
      break;
    case "google-drive":
      storageInstance = new GoogleDriveStorage();
      break;
    default:
      throw new Error(`Unknown storage provider: ${providerType}`);
  }

  return storageInstance;
}

// Re-export types for convenience
export * from "./types";
