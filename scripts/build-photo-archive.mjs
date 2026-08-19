import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, open, rm, stat } from "node:fs/promises";
import path from "node:path";

const DEFAULT_OUTPUT = "output/media-archive/silje-og-sindre-bilder.zip";
const UTF8_DATA_DESCRIPTOR_FLAG = 0x0808;
const STORE_METHOD = 0;
const MAX_ZIP32_VALUE = 0xffffffff;
const CRC32_TABLE = createCrc32Table();

const options = parseArguments(process.argv.slice(2));
const apiUrl = (
  options.apiUrl || process.env.NEXT_PUBLIC_MEDIA_API_URL || ""
).replace(/\/$/, "");
const outputPath = path.resolve(options.output || DEFAULT_OUTPUT);

if (!apiUrl) {
  throw new Error(
    "Mangler NEXT_PUBLIC_MEDIA_API_URL. Kjør med .env.local eller bruk --api-url."
  );
}

let archiveStats;
if (options.uploadExisting) {
  archiveStats = await stat(outputPath);
  console.log(`Bruker eksisterende ZIP: ${outputPath} (${formatBytes(archiveStats.size)})`);
} else {
  const photos = await listPhotos(apiUrl, options.limit);
  if (photos.length === 0) {
    throw new Error("Fant ingen bilder å legge i arkivet.");
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await rm(outputPath, { force: true });

  console.log(`Lager ZIP med ${photos.length} originalbilder …`);
  await buildZipArchive(photos, outputPath);

  archiveStats = await stat(outputPath);
  console.log(`Ferdig: ${outputPath} (${formatBytes(archiveStats.size)})`);
}

if (options.upload) {
  let uploadToken =
    process.env.ARCHIVE_UPLOAD_TOKEN || process.env.NEXT_PUBLIC_MEDIA_UPLOAD_TOKEN;
  if (!uploadToken && options.configureUploadSecret) {
    uploadToken = await configureArchiveUploadSecret();
  }
  if (!uploadToken) {
    throw new Error(
      "Mangler ARCHIVE_UPLOAD_TOKEN eller NEXT_PUBLIC_MEDIA_UPLOAD_TOKEN for opplasting av arkivet."
    );
  }
  await uploadArchive(apiUrl, uploadToken, outputPath, archiveStats.size);
}

async function configureArchiveUploadSecret() {
  const token = randomBytes(32).toString("hex");
  console.log("Oppretter et separat vedlikeholdstoken for arkivopplasting …");

  await new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      [
        "--yes",
        "wrangler@latest",
        "secret",
        "put",
        "ARCHIVE_UPLOAD_TOKEN",
        "--config",
        "cloudflare/media-worker/wrangler.toml",
      ],
      { stdio: ["pipe", "inherit", "inherit"] }
    );
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Wrangler avsluttet med kode ${code ?? "ukjent"}.`));
    });
    child.stdin.end(token);
  });

  console.log("Venter på at den nye Worker-versjonen blir aktiv …");
  await new Promise((resolve) => setTimeout(resolve, 10_000));
  return token;
}

async function listPhotos(baseUrl, maximum) {
  const photos = [];
  let cursor;

  do {
    const url = new URL(`${baseUrl}/media`);
    url.searchParams.set("limit", "100");
    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Kunne ikke hente medielisten (${response.status}).`);
    }

    const page = await response.json();
    for (const photo of page.photos || []) {
      if (photo.mediaType === "image" && photo.status === "ready") {
        photos.push(photo);
        if (maximum && photos.length >= maximum) {
          return photos;
        }
      }
    }

    cursor = page.hasMore ? page.nextCursor : undefined;
  } while (cursor);

  return photos;
}

async function buildZipArchive(photos, destination) {
  const file = await open(destination, "w");
  const entries = [];
  const usedNames = new Map();
  let offset = 0;

  try {
    for (const [index, photo] of photos.entries()) {
      const filename = uniqueArchiveName(photo, usedNames);
      const filenameBytes = Buffer.from(`Silje og Sindre/${filename}`, "utf8");
      const entryOffset = offset;
      const timestamp = zipTimestamp(photo.takenAt || photo.uploadedAt);

      const localHeader = Buffer.alloc(30);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(UTF8_DATA_DESCRIPTOR_FLAG, 6);
      localHeader.writeUInt16LE(STORE_METHOD, 8);
      localHeader.writeUInt16LE(timestamp.time, 10);
      localHeader.writeUInt16LE(timestamp.date, 12);
      localHeader.writeUInt16LE(filenameBytes.length, 26);

      offset += await writeAll(file, localHeader, offset);
      offset += await writeAll(file, filenameBytes, offset);

      const sourceUrl = photo.downloadUrl || photo.url;
      const response = await fetchWithRetry(sourceUrl, {}, `bilde ${index + 1}`);
      if (!response.body) {
        throw new Error(`Bildet ${photo.originalName || photo.filename} mangler innhold.`);
      }

      let crc = 0xffffffff;
      let size = 0;
      for await (const value of response.body) {
        const chunk = Buffer.from(value);
        crc = updateCrc32(crc, chunk);
        size += chunk.length;
        offset += await writeAll(file, chunk, offset);
      }
      crc = (crc ^ 0xffffffff) >>> 0;

      if (size > MAX_ZIP32_VALUE || entryOffset > MAX_ZIP32_VALUE) {
        throw new Error("Arkivet har blitt for stort for ZIP32-formatet.");
      }

      const descriptor = Buffer.alloc(16);
      descriptor.writeUInt32LE(0x08074b50, 0);
      descriptor.writeUInt32LE(crc, 4);
      descriptor.writeUInt32LE(size, 8);
      descriptor.writeUInt32LE(size, 12);
      offset += await writeAll(file, descriptor, offset);

      entries.push({
        crc,
        date: timestamp.date,
        filenameBytes,
        offset: entryOffset,
        size,
        time: timestamp.time,
      });

      console.log(
        `[${index + 1}/${photos.length}] ${filename} (${formatBytes(size)})`
      );
    }

    const centralDirectoryOffset = offset;
    for (const entry of entries) {
      const centralHeader = Buffer.alloc(46);
      centralHeader.writeUInt32LE(0x02014b50, 0);
      centralHeader.writeUInt16LE(0x0314, 4);
      centralHeader.writeUInt16LE(20, 6);
      centralHeader.writeUInt16LE(UTF8_DATA_DESCRIPTOR_FLAG, 8);
      centralHeader.writeUInt16LE(STORE_METHOD, 10);
      centralHeader.writeUInt16LE(entry.time, 12);
      centralHeader.writeUInt16LE(entry.date, 14);
      centralHeader.writeUInt32LE(entry.crc, 16);
      centralHeader.writeUInt32LE(entry.size, 20);
      centralHeader.writeUInt32LE(entry.size, 24);
      centralHeader.writeUInt16LE(entry.filenameBytes.length, 28);
      centralHeader.writeUInt32LE(entry.offset, 42);

      offset += await writeAll(file, centralHeader, offset);
      offset += await writeAll(file, entry.filenameBytes, offset);
    }

    const centralDirectorySize = offset - centralDirectoryOffset;
    if (
      entries.length > 0xffff ||
      centralDirectoryOffset > MAX_ZIP32_VALUE ||
      centralDirectorySize > MAX_ZIP32_VALUE
    ) {
      throw new Error("Arkivet har blitt for stort for ZIP32-formatet.");
    }

    const endRecord = Buffer.alloc(22);
    endRecord.writeUInt32LE(0x06054b50, 0);
    endRecord.writeUInt16LE(entries.length, 8);
    endRecord.writeUInt16LE(entries.length, 10);
    endRecord.writeUInt32LE(centralDirectorySize, 12);
    endRecord.writeUInt32LE(centralDirectoryOffset, 16);
    await writeAll(file, endRecord, offset);
  } catch (error) {
    await file.close();
    await rm(destination, { force: true });
    throw error;
  }

  await file.close();
}

async function uploadArchive(baseUrl, token, sourcePath, totalBytes) {
  console.log("Starter delt opplasting til R2 …");
  const upload = await requestJson(
    `${baseUrl}/downloads/photos.zip/upload`,
    {
      method: "POST",
      headers: { "X-Upload-Token": token },
    },
    "starte arkivopplasting"
  );

  const partSize = Math.max(Number(upload.partSize) || 0, 5 * 1024 * 1024);
  const partCount = Math.ceil(totalBytes / partSize);
  const parts = [];
  const file = await open(sourcePath, "r");

  try {
    for (let partNumber = 1; partNumber <= partCount; partNumber++) {
      const start = (partNumber - 1) * partSize;
      const length = Math.min(partSize, totalBytes - start);
      const buffer = Buffer.allocUnsafe(length);
      await readAll(file, buffer, start);

      const part = await requestJson(
        `${upload.uploadPartsUrl}/${partNumber}?uploadId=${encodeURIComponent(upload.uploadId)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/octet-stream",
            "X-Upload-Token": token,
          },
          body: buffer,
        },
        `laste opp arkivdel ${partNumber}`
      );
      parts.push({ etag: part.etag, partNumber: part.partNumber });
      console.log(`[${partNumber}/${partCount}] arkivdel lastet opp`);
    }

    const result = await requestJson(
      upload.completeUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Upload-Token": token,
        },
        body: JSON.stringify({ parts }),
      },
      "fullføre arkivopplasting"
    );
    console.log(`Arkivet er tilgjengelig: ${result.downloadUrl}`);
  } catch (error) {
    await fetch(upload.abortUrl, {
      method: "DELETE",
      headers: { "X-Upload-Token": token },
    }).catch(() => undefined);
    throw error;
  } finally {
    await file.close();
  }
}

async function requestJson(url, init, description) {
  const response = await fetchWithRetry(url, init, description);
  const payload = await response.json().catch(() => null);
  if (!payload) {
    throw new Error(`Kunne ikke ${description}: ugyldig svar fra serveren.`);
  }
  return payload;
}

async function fetchWithRetry(url, init, description) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok) {
        return response;
      }
      const detail = await response.text().catch(() => "");
      const error = new Error(
        `Kunne ikke ${description} (${response.status})${detail ? `: ${detail}` : ""}`
      );
      if (response.status < 500 && response.status !== 429) {
        error.retryable = false;
      }
      throw error;
    } catch (error) {
      if (error?.retryable === false) {
        throw error;
      }
      lastError = error;
    }

    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw lastError;
}

function uniqueArchiveName(photo, usedNames) {
  const fallbackExtension = extensionForMimeType(photo.mimeType);
  const source = String(photo.originalName || photo.filename || `bilde${fallbackExtension}`);
  const cleaned = source
    .normalize("NFC")
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f<>:"|?*]/g, "_")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 180) || `bilde${fallbackExtension}`;

  const extension = path.extname(cleaned);
  const stem = path.basename(cleaned, extension);
  const key = cleaned.toLocaleLowerCase("nb-NO");
  const count = (usedNames.get(key) || 0) + 1;
  usedNames.set(key, count);

  return count === 1 ? cleaned : `${stem} (${count})${extension}`;
}

function extensionForMimeType(mimeType) {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/heic") return ".heic";
  if (mimeType === "image/heif") return ".heif";
  return ".jpg";
}

function zipTimestamp(value) {
  const date = new Date(value || Date.now());
  const validDate = Number.isFinite(date.getTime()) ? date : new Date();
  const year = Math.min(Math.max(validDate.getUTCFullYear(), 1980), 2107);
  return {
    date:
      ((year - 1980) << 9) |
      ((validDate.getUTCMonth() + 1) << 5) |
      validDate.getUTCDate(),
    time:
      (validDate.getUTCHours() << 11) |
      (validDate.getUTCMinutes() << 5) |
      Math.floor(validDate.getUTCSeconds() / 2),
  };
}

function createCrc32Table() {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index++) {
    let value = index;
    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

function updateCrc32(crc, chunk) {
  let value = crc;
  for (const byte of chunk) {
    value = CRC32_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return value >>> 0;
}

async function writeAll(file, buffer, position) {
  let written = 0;
  while (written < buffer.length) {
    const result = await file.write(
      buffer,
      written,
      buffer.length - written,
      position + written
    );
    written += result.bytesWritten;
  }
  return written;
}

async function readAll(file, buffer, position) {
  let read = 0;
  while (read < buffer.length) {
    const result = await file.read(
      buffer,
      read,
      buffer.length - read,
      position + read
    );
    if (result.bytesRead === 0) {
      throw new Error("Uventet slutt på ZIP-filen under opplasting.");
    }
    read += result.bytesRead;
  }
}

function parseArguments(values) {
  const parsed = { configureUploadSecret: false, upload: false, uploadExisting: false };
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    if (value === "--upload") {
      parsed.upload = true;
    } else if (value === "--upload-existing") {
      parsed.upload = true;
      parsed.uploadExisting = true;
      parsed.output = values[++index];
      if (!parsed.output) {
        throw new Error("--upload-existing krever en filsti.");
      }
    } else if (value === "--configure-upload-secret") {
      parsed.configureUploadSecret = true;
    } else if (value === "--api-url") {
      parsed.apiUrl = values[++index];
    } else if (value === "--output") {
      parsed.output = values[++index];
    } else if (value === "--limit") {
      const limit = Number(values[++index]);
      if (!Number.isInteger(limit) || limit < 1) {
        throw new Error("--limit må være et positivt heltall.");
      }
      parsed.limit = limit;
    } else {
      throw new Error(`Ukjent argument: ${value}`);
    }
  }
  return parsed;
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
