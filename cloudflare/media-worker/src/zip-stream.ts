const UTF8_FLAG = 0x0800;
const DATA_DESCRIPTOR_FLAG = 0x0008;
const STORE_METHOD = 0;
const MAX_ZIP32_VALUE = 0xffffffff;
const MAX_ZIP16_VALUE = 0xffff;
const ZIP64_VERSION = 45;

export interface StreamingZipSource {
  filename: string;
  size: number;
  timestamp?: string;
}

export interface StreamingZipEntry extends StreamingZipSource {
  dataDescriptorLength: number;
  localHeader: Uint8Array;
  localOffset: number;
  usesZip64Size: boolean;
}

export interface StreamingZipLayout {
  centralDirectoryLength: number;
  contentLength: number;
  entries: StreamingZipEntry[];
  usesZip64: boolean;
}

export function createStreamingZipLayout(
  sources: StreamingZipSource[]
): StreamingZipLayout {
  const entries: StreamingZipEntry[] = [];
  let offset = 0;

  for (const source of sources) {
    if (!Number.isSafeInteger(source.size) || source.size < 0) {
      throw new Error("En valgt fil har ugyldig størrelse");
    }

    const filenameBytes = new TextEncoder().encode(source.filename);
    const timestamp = zipTimestamp(source.timestamp);
    const usesZip64Size = source.size > MAX_ZIP32_VALUE;
    const zip64Extra = usesZip64Size
      ? createZip64Extra([source.size, source.size])
      : null;
    const localHeader = new Uint8Array(
      30 + filenameBytes.length + (zip64Extra?.length || 0)
    );
    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, usesZip64Size ? ZIP64_VERSION : 20);
    writeUint16(localHeader, 6, UTF8_FLAG | DATA_DESCRIPTOR_FLAG);
    writeUint16(localHeader, 8, STORE_METHOD);
    writeUint16(localHeader, 10, timestamp.time);
    writeUint16(localHeader, 12, timestamp.date);
    writeUint32(localHeader, 14, 0);
    writeUint32(localHeader, 18, usesZip64Size ? MAX_ZIP32_VALUE : 0);
    writeUint32(localHeader, 22, usesZip64Size ? MAX_ZIP32_VALUE : 0);
    writeUint16(localHeader, 26, filenameBytes.length);
    writeUint16(localHeader, 28, zip64Extra?.length || 0);
    localHeader.set(filenameBytes, 30);
    if (zip64Extra) localHeader.set(zip64Extra, 30 + filenameBytes.length);

    const dataDescriptorLength = usesZip64Size ? 24 : 16;
    entries.push({
      ...source,
      dataDescriptorLength,
      localHeader,
      localOffset: offset,
      usesZip64Size,
    });
    offset += localHeader.length + source.size + dataDescriptorLength;
  }

  const centralDirectoryOffset = offset;
  const centralDirectoryLength = entries.reduce(
    (length, entry) => length + centralHeaderLength(entry),
    0
  );
  offset += centralDirectoryLength;

  const usesZip64 =
    entries.some(
      (entry) => entry.usesZip64Size || entry.localOffset > MAX_ZIP32_VALUE
    ) ||
    entries.length > MAX_ZIP16_VALUE ||
    centralDirectoryOffset > MAX_ZIP32_VALUE ||
    centralDirectoryLength > MAX_ZIP32_VALUE;

  offset += usesZip64 ? 56 + 20 : 0;
  offset += 22;

  return {
    centralDirectoryLength,
    contentLength: offset,
    entries,
    usesZip64,
  };
}

export function createStreamingZipDataDescriptor(
  entry: StreamingZipEntry,
  crc32: number
): Uint8Array {
  const descriptor = new Uint8Array(entry.dataDescriptorLength);
  writeUint32(descriptor, 0, 0x08074b50);
  writeUint32(descriptor, 4, crc32 >>> 0);
  if (entry.usesZip64Size) {
    writeUint64(descriptor, 8, entry.size);
    writeUint64(descriptor, 16, entry.size);
  } else {
    writeUint32(descriptor, 8, entry.size);
    writeUint32(descriptor, 12, entry.size);
  }
  return descriptor;
}

export function createStreamingZipCentralDirectory(
  layout: StreamingZipLayout,
  crc32Values: number[]
): Uint8Array[] {
  if (crc32Values.length !== layout.entries.length) {
    throw new Error("Mangler kontrollsummer for ZIP-arkivet");
  }

  const chunks: Uint8Array[] = [];
  const centralDirectoryOffset = layout.entries.reduce(
    (offset, entry) =>
      offset + entry.localHeader.length + entry.size + entry.dataDescriptorLength,
    0
  );

  for (let index = 0; index < layout.entries.length; index++) {
    const entry = layout.entries[index];
    const filenameBytes = new TextEncoder().encode(entry.filename);
    const timestamp = zipTimestamp(entry.timestamp);
    const usesZip64Offset = entry.localOffset > MAX_ZIP32_VALUE;
    const zip64Values = [
      ...(entry.usesZip64Size ? [entry.size, entry.size] : []),
      ...(usesZip64Offset ? [entry.localOffset] : []),
    ];
    const zip64Extra = zip64Values.length
      ? createZip64Extra(zip64Values)
      : null;
    const header = new Uint8Array(
      46 + filenameBytes.length + (zip64Extra?.length || 0)
    );
    const needsZip64 = entry.usesZip64Size || usesZip64Offset;
    writeUint32(header, 0, 0x02014b50);
    writeUint16(header, 4, needsZip64 ? 0x032d : 0x0314);
    writeUint16(header, 6, needsZip64 ? ZIP64_VERSION : 20);
    writeUint16(header, 8, UTF8_FLAG | DATA_DESCRIPTOR_FLAG);
    writeUint16(header, 10, STORE_METHOD);
    writeUint16(header, 12, timestamp.time);
    writeUint16(header, 14, timestamp.date);
    writeUint32(header, 16, crc32Values[index] >>> 0);
    writeUint32(header, 20, entry.usesZip64Size ? MAX_ZIP32_VALUE : entry.size);
    writeUint32(header, 24, entry.usesZip64Size ? MAX_ZIP32_VALUE : entry.size);
    writeUint16(header, 28, filenameBytes.length);
    writeUint16(header, 30, zip64Extra?.length || 0);
    writeUint32(
      header,
      42,
      usesZip64Offset ? MAX_ZIP32_VALUE : entry.localOffset
    );
    header.set(filenameBytes, 46);
    if (zip64Extra) header.set(zip64Extra, 46 + filenameBytes.length);
    chunks.push(header);
  }

  if (layout.usesZip64) {
    const zip64EndOffset = centralDirectoryOffset + layout.centralDirectoryLength;
    const zip64End = new Uint8Array(56);
    writeUint32(zip64End, 0, 0x06064b50);
    writeUint64(zip64End, 4, 44);
    writeUint16(zip64End, 12, ZIP64_VERSION);
    writeUint16(zip64End, 14, ZIP64_VERSION);
    writeUint64(zip64End, 24, layout.entries.length);
    writeUint64(zip64End, 32, layout.entries.length);
    writeUint64(zip64End, 40, layout.centralDirectoryLength);
    writeUint64(zip64End, 48, centralDirectoryOffset);
    chunks.push(zip64End);

    const locator = new Uint8Array(20);
    writeUint32(locator, 0, 0x07064b50);
    writeUint64(locator, 8, zip64EndOffset);
    writeUint32(locator, 16, 1);
    chunks.push(locator);
  }

  const end = new Uint8Array(22);
  writeUint32(end, 0, 0x06054b50);
  writeUint16(end, 8, layout.usesZip64 ? MAX_ZIP16_VALUE : layout.entries.length);
  writeUint16(end, 10, layout.usesZip64 ? MAX_ZIP16_VALUE : layout.entries.length);
  writeUint32(
    end,
    12,
    layout.usesZip64 ? MAX_ZIP32_VALUE : layout.centralDirectoryLength
  );
  writeUint32(
    end,
    16,
    layout.usesZip64 ? MAX_ZIP32_VALUE : centralDirectoryOffset
  );
  chunks.push(end);
  return chunks;
}

function centralHeaderLength(entry: StreamingZipEntry): number {
  const filenameLength = new TextEncoder().encode(entry.filename).length;
  const zip64ValueCount =
    (entry.usesZip64Size ? 2 : 0) +
    (entry.localOffset > MAX_ZIP32_VALUE ? 1 : 0);
  return 46 + filenameLength + (zip64ValueCount ? 4 + zip64ValueCount * 8 : 0);
}

function createZip64Extra(values: number[]): Uint8Array {
  const extra = new Uint8Array(4 + values.length * 8);
  writeUint16(extra, 0, 0x0001);
  writeUint16(extra, 2, values.length * 8);
  values.forEach((value, index) => writeUint64(extra, 4 + index * 8, value));
  return extra;
}

function zipTimestamp(value: string | undefined): { date: number; time: number } {
  const parsed = new Date(value || Date.now());
  const date = Number.isFinite(parsed.getTime()) ? parsed : new Date();
  const year = Math.min(Math.max(date.getUTCFullYear(), 1980), 2107);
  return {
    date: ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate(),
    time:
      (date.getUTCHours() << 11) |
      (date.getUTCMinutes() << 5) |
      Math.floor(date.getUTCSeconds() / 2),
  };
}

function writeUint16(target: Uint8Array, offset: number, value: number): void {
  new DataView(target.buffer, target.byteOffset, target.byteLength).setUint16(
    offset,
    value,
    true
  );
}

function writeUint32(target: Uint8Array, offset: number, value: number): void {
  new DataView(target.buffer, target.byteOffset, target.byteLength).setUint32(
    offset,
    value,
    true
  );
}

function writeUint64(target: Uint8Array, offset: number, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("ZIP64-verdien er utenfor støttet område");
  }
  new DataView(target.buffer, target.byteOffset, target.byteLength).setBigUint64(
    offset,
    BigInt(value),
    true
  );
}
