import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, open, rm, stat } from "node:fs/promises";
import path from "node:path";
import {
  createZipCentralDirectory,
  MAX_ZIP32_VALUE,
} from "./media-archive-zip.mjs";

const ARCHIVES = {
  photos: {
    mediaType: "image",
    output: "output/media-archive/silje-og-sindre-bilder.zip",
    directory: "Silje og Sindre - Bilder",
    label: "bilder",
  },
  videos: {
    mediaType: "video",
    output: "output/media-archive/silje-og-sindre-videoer.zip",
    directory: "Silje og Sindre - Videoer",
    label: "videoer",
  },
};
const UTF8_DATA_DESCRIPTOR_FLAG = 0x0808;
const STORE_METHOD = 0;
const CRC32_TABLE = createCrc32Table();

const options = parseArguments(process.argv.slice(2));
const apiUrl = (
  options.apiUrl || process.env.NEXT_PUBLIC_MEDIA_API_URL || ""
).replace(/\/$/, "");
const archiveKinds = options.allTypes ? ["photos", "videos"] : [options.type || "photos"];

if (options.output && archiveKinds.length !== 1) {
  throw new Error("--output kan bare brukes sammen med én arkivtype.");
}

if ((options.uploadExisting || options.verifyExisting) && archiveKinds.length !== 1) {
  throw new Error("Eksisterende ZIP kan bare brukes sammen med én arkivtype.");
}

if (!apiUrl) {
  throw new Error(
    "Mangler NEXT_PUBLIC_MEDIA_API_URL. Kjør med .env.local eller bruk --api-url."
  );
}

let uploadToken;
if (options.upload) {
  uploadToken =
    process.env.ARCHIVE_UPLOAD_TOKEN || process.env.NEXT_PUBLIC_MEDIA_UPLOAD_TOKEN;
  if (!uploadToken && options.configureUploadSecret) {
    uploadToken = await configureArchiveUploadSecret();
  }
  if (!uploadToken) {
    throw new Error(
      "Mangler ARCHIVE_UPLOAD_TOKEN eller NEXT_PUBLIC_MEDIA_UPLOAD_TOKEN for opplasting av arkivet."
    );
  }
}

for (const kind of archiveKinds) {
  const archive = ARCHIVES[kind];
  const outputPath = path.resolve(options.output || archive.output);
  const media = await listMedia(apiUrl, archive.mediaType, options.limit);
  if (media.length === 0) {
    throw new Error(`Fant ingen ${archive.label} å legge i arkivet.`);
  }

  let archiveStats;
  let manifestEntries;

  if (options.manifestOnly) {
    archiveStats = await stat(outputPath);
    console.log(`Leser ZIP-oversikt: ${outputPath} (${formatBytes(archiveStats.size)})`);
    manifestEntries = await readZipManifest(outputPath, media);
  } else if (options.uploadExisting || options.verifyExisting) {
    archiveStats = await stat(outputPath);
    console.log(`Bruker eksisterende ZIP: ${outputPath} (${formatBytes(archiveStats.size)})`);
    manifestEntries = await readZipManifest(outputPath, media);
  } else {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await rm(outputPath, { force: true });

    console.log(`Lager ZIP med ${media.length} originale ${archive.label} …`);
    manifestEntries = await buildZipArchive(media, outputPath, archive.directory);

    archiveStats = await stat(outputPath);
    console.log(`Ferdig: ${outputPath} (${formatBytes(archiveStats.size)})`);
  }

  if (options.upload) {
    if (!options.manifestOnly && !options.skipArchiveUpload) {
      await uploadArchive(apiUrl, uploadToken, outputPath, archiveStats.size, kind);
    }
    await uploadArchiveManifest(apiUrl, uploadToken, kind, manifestEntries);
  }
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

async function listMedia(baseUrl, mediaType, maximum) {
  const media = [];
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
    for (const item of page.photos || []) {
      const originalIsAvailable = item.downloadUrl || item.mediaType === "image";
      if (
        item.mediaType === mediaType &&
        (item.status === "ready" || item.status === "processing") &&
        originalIsAvailable
      ) {
        media.push(item);
        if (maximum && media.length >= maximum) {
          return media;
        }
      }
    }

    cursor = page.hasMore ? page.nextCursor : undefined;
  } while (cursor);

  return media;
}

async function buildZipArchive(media, destination, directory) {
  const file = await open(destination, "w");
  const entries = [];
  const usedNames = new Map();
  let offset = 0;

  try {
    for (const [index, item] of media.entries()) {
      const filename = uniqueArchiveName(item, usedNames);
      const filenameBytes = Buffer.from(`${directory}/${filename}`, "utf8");
      const entryOffset = offset;
      const timestamp = zipTimestamp(item.takenAt || item.uploadedAt);

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

      const sourceUrl = item.downloadUrl || item.url;
      const streamed = await streamMediaContent(
        sourceUrl,
        file,
        offset,
        `mediefil ${index + 1}`
      );
      const size = streamed.size;
      const crc = streamed.crc;
      offset = streamed.offset;

      if (size > MAX_ZIP32_VALUE) {
        throw new Error("En enkelt fil er for stor for arkivformatet.");
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
        flags: UTF8_DATA_DESCRIPTOR_FLAG,
        id: item.id,
        method: STORE_METHOD,
        offset: entryOffset,
        size,
        time: timestamp.time,
      });

      console.log(
        `[${index + 1}/${media.length}] ${filename} (${formatBytes(size)})`
      );
    }

    const centralDirectory = createZipCentralDirectory(entries, offset);
    for (const chunk of centralDirectory.chunks) {
      offset += await writeAll(file, chunk, offset);
    }
  } catch (error) {
    await file.close();
    await rm(destination, { force: true });
    throw error;
  }

  await file.close();
  return entries.map((entry) => ({
    crc32: entry.crc,
    id: entry.id,
    size: entry.size,
  }));
}

async function uploadArchive(baseUrl, token, sourcePath, totalBytes, kind) {
  console.log("Starter delt opplasting til R2 …");
  const upload = await requestJson(
    `${baseUrl}/downloads/${kind}.zip/upload`,
    {
      method: "POST",
      headers: { "X-Upload-Token": token },
    },
    "starte arkivopplasting"
  );

  const partSize = Math.max(Number(upload.partSize) || 0, 50 * 1024 * 1024);
  const partCount = Math.ceil(totalBytes / partSize);
  const parts = new Array(partCount);
  const file = await open(sourcePath, "r");

  try {
    let nextPartNumber = 1;
    let completedParts = 0;
    const uploadNextParts = async () => {
      while (true) {
        const partNumber = nextPartNumber++;
        if (partNumber > partCount) return;

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
        parts[partNumber - 1] = {
          etag: part.etag,
          partNumber: part.partNumber,
        };
        completedParts += 1;
        console.log(`[${completedParts}/${partCount}] arkivdel lastet opp`);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(4, partCount) }, () => uploadNextParts())
    );

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

async function uploadArchiveManifest(baseUrl, token, kind, entries) {
  const result = await requestJson(
    `${baseUrl}/downloads/${kind}.zip/manifest`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Upload-Token": token,
      },
      body: JSON.stringify({ entries, kind, version: 1 }),
    },
    `laste opp ${kind}-oversikten`
  );
  console.log(`Nedlastingsoversikt lastet opp: ${result.count} filer`);
}

async function readZipManifest(sourcePath, media) {
  const file = await open(sourcePath, "r");
  try {
    const archiveStats = await file.stat();
    const tailLength = Math.min(archiveStats.size, 65_557);
    const tail = Buffer.alloc(tailLength);
    await readAll(file, tail, archiveStats.size - tailLength);

    let endIndex = -1;
    for (let index = tail.length - 22; index >= 0; index--) {
      if (tail.readUInt32LE(index) === 0x06054b50) {
        endIndex = index;
        break;
      }
    }
    if (endIndex < 0) {
      throw new Error("Fant ikke slutten på ZIP-arkivet.");
    }

    const endOffset = archiveStats.size - tailLength + endIndex;
    let entryCount = tail.readUInt16LE(endIndex + 10);
    let centralDirectorySize = tail.readUInt32LE(endIndex + 12);
    let centralDirectoryOffset = tail.readUInt32LE(endIndex + 16);

    if (
      entryCount === 0xffff ||
      centralDirectorySize === 0xffffffff ||
      centralDirectoryOffset === 0xffffffff
    ) {
      const locator = Buffer.alloc(20);
      await readAll(file, locator, endOffset - locator.length);
      if (locator.readUInt32LE(0) !== 0x07064b50) {
        throw new Error("Fant ikke ZIP64-locatoren.");
      }
      const zip64EndOffset = safeZip64Number(locator.readBigUInt64LE(8));
      const zip64End = Buffer.alloc(56);
      await readAll(file, zip64End, zip64EndOffset);
      if (zip64End.readUInt32LE(0) !== 0x06064b50) {
        throw new Error("Fant ikke ZIP64-sluttposten.");
      }
      entryCount = safeZip64Number(zip64End.readBigUInt64LE(32));
      centralDirectorySize = safeZip64Number(zip64End.readBigUInt64LE(40));
      centralDirectoryOffset = safeZip64Number(zip64End.readBigUInt64LE(48));
    }

    if (entryCount !== media.length || centralDirectorySize > 10 * 1024 * 1024) {
      throw new Error(
        `ZIP-oversikten har ${entryCount} filer, men albumet har ${media.length}.`
      );
    }

    const directory = Buffer.alloc(centralDirectorySize);
    await readAll(file, directory, centralDirectoryOffset);
    const manifest = [];
    let offset = 0;

    for (let index = 0; index < entryCount; index++) {
      if (directory.readUInt32LE(offset) !== 0x02014b50) {
        throw new Error(`Ugyldig ZIP-oppføring ${index + 1}.`);
      }
      const crc32 = directory.readUInt32LE(offset + 16);
      const size = directory.readUInt32LE(offset + 24);
      const filenameLength = directory.readUInt16LE(offset + 28);
      const extraLength = directory.readUInt16LE(offset + 30);
      const commentLength = directory.readUInt16LE(offset + 32);
      const item = media[index];
      if (size !== item.size) {
        throw new Error(
          `Størrelsen på ZIP-oppføring ${index + 1} stemmer ikke med albumet.`
        );
      }
      manifest.push({ crc32, id: item.id, size });
      offset += 46 + filenameLength + extraLength + commentLength;
    }

    return manifest;
  } finally {
    await file.close();
  }
}

function safeZip64Number(value) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new Error("ZIP64-verdien er for stor.");
  }
  return number;
}

async function requestJson(url, init, description) {
  const response = await fetchWithRetry(url, init, description);
  const payload = await response.json().catch(() => null);
  if (!payload) {
    throw new Error(`Kunne ikke ${description}: ugyldig svar fra serveren.`);
  }
  return payload;
}

async function streamMediaContent(sourceUrl, file, initialOffset, description) {
  const maximumAttempts = 8;
  let crc = 0xffffffff;
  let size = 0;
  let offset = initialOffset;
  let totalSize;
  let lastError;

  for (let attempt = 1; attempt <= maximumAttempts; attempt++) {
    const response = await fetchWithRetry(
      sourceUrl,
      size > 0 ? { headers: { Range: `bytes=${size}-` } } : {},
      description
    );

    if (!response.body) {
      throw new Error(`${description} mangler innhold.`);
    }

    if (size > 0) {
      const contentRange = parseContentRange(response.headers.get("Content-Range"));
      if (response.status !== 206 || !contentRange || contentRange.start !== size) {
        throw new Error(`${description} kunne ikke gjenopptas fra byte ${size}.`);
      }
      totalSize = totalSize ?? contentRange.total;
    } else {
      const contentLength = Number(response.headers.get("Content-Length"));
      if (Number.isSafeInteger(contentLength) && contentLength >= 0) {
        totalSize = contentLength;
      }
    }

    const expectedResponseBytes = Number(response.headers.get("Content-Length"));
    let responseBytes = 0;

    try {
      for await (const value of response.body) {
        const chunk = Buffer.from(value);
        crc = updateCrc32(crc, chunk);
        size += chunk.length;
        responseBytes += chunk.length;
        offset += await writeAll(file, chunk, offset);
      }
    } catch (error) {
      lastError = error;
      if (totalSize !== undefined && size === totalSize) {
        return { crc: (crc ^ 0xffffffff) >>> 0, size, offset };
      }
      if (attempt === maximumAttempts) {
        throw error;
      }
      console.warn(
        `${description}: forbindelsen ble brutt etter ${formatBytes(size)}; fortsetter fra siste byte (forsøk ${attempt + 1}/${maximumAttempts}) …`
      );
      await waitBeforeRetry(attempt);
      continue;
    }

    const responseWasTruncated =
      Number.isSafeInteger(expectedResponseBytes) &&
      expectedResponseBytes >= 0 &&
      responseBytes !== expectedResponseBytes;
    const fileIsIncomplete = totalSize !== undefined && size !== totalSize;
    if (responseWasTruncated || fileIsIncomplete) {
      lastError = new Error(`${description} ble avkortet etter ${formatBytes(size)}.`);
      if (attempt === maximumAttempts) {
        throw lastError;
      }
      console.warn(
        `${description}: ufullstendig svar etter ${formatBytes(size)}; fortsetter fra siste byte (forsøk ${attempt + 1}/${maximumAttempts}) …`
      );
      await waitBeforeRetry(attempt);
      continue;
    }

    return { crc: (crc ^ 0xffffffff) >>> 0, size, offset };
  }

  throw lastError || new Error(`${description} kunne ikke lastes ned.`);
}

function parseContentRange(value) {
  const match = value?.match(/^bytes (\d+)-(\d+)\/(\d+)$/);
  if (!match) return null;

  const start = Number(match[1]);
  const end = Number(match[2]);
  const total = Number(match[3]);
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    !Number.isSafeInteger(total) ||
    start < 0 ||
    end < start ||
    total <= end
  ) {
    return null;
  }

  return { start, end, total };
}

async function waitBeforeRetry(attempt) {
  await new Promise((resolve) => setTimeout(resolve, Math.min(attempt, 5) * 1000));
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

function uniqueArchiveName(item, usedNames) {
  const fallbackExtension = extensionForMimeType(item.mimeType);
  const fallbackName = item.mediaType === "video" ? "video" : "bilde";
  const source = String(
    item.originalName || item.filename || `${fallbackName}${fallbackExtension}`
  );
  const cleaned = source
    .normalize("NFC")
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f<>:"|?*]/g, "_")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 180) || `${fallbackName}${fallbackExtension}`;

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
  if (mimeType === "video/quicktime") return ".mov";
  if (mimeType === "video/webm") return ".webm";
  if (mimeType === "video/x-m4v") return ".m4v";
  if (mimeType === "video/mpeg") return ".mpeg";
  if (mimeType === "video/mp4") return ".mp4";
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
  const parsed = {
    allTypes: false,
    configureUploadSecret: false,
    manifestOnly: false,
    skipArchiveUpload: false,
    upload: false,
    uploadExisting: false,
    verifyExisting: false,
  };
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    if (value === "--upload") {
      parsed.upload = true;
    } else if (value === "--upload-manifest-only") {
      parsed.upload = true;
      parsed.manifestOnly = true;
    } else if (value === "--build-and-upload-manifest") {
      parsed.upload = true;
      parsed.skipArchiveUpload = true;
    } else if (value === "--upload-existing") {
      parsed.upload = true;
      parsed.uploadExisting = true;
      parsed.output = values[++index];
      if (!parsed.output) {
        throw new Error("--upload-existing krever en filsti.");
      }
    } else if (value === "--verify-existing") {
      parsed.verifyExisting = true;
      parsed.output = values[++index];
      if (!parsed.output) {
        throw new Error("--verify-existing krever en filsti.");
      }
    } else if (value === "--configure-upload-secret") {
      parsed.configureUploadSecret = true;
    } else if (value === "--all-types") {
      parsed.allTypes = true;
    } else if (value === "--type") {
      const type = values[++index];
      if (type !== "photos" && type !== "videos") {
        throw new Error("--type må være photos eller videos.");
      }
      parsed.type = type;
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
  if (parsed.allTypes && parsed.type) {
    throw new Error("Bruk enten --all-types eller --type, ikke begge.");
  }
  return parsed;
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
