export const MAX_ZIP32_VALUE = 0xffffffff;
export const MAX_ZIP16_VALUE = 0xffff;
export const ZIP64_VERSION = 45;

export function createZipCentralDirectory(entries, centralDirectoryOffset) {
  const chunks = [];
  let offset = centralDirectoryOffset;

  for (const entry of entries) {
    const usesZip64Offset = entry.offset > MAX_ZIP32_VALUE;
    const zip64Extra = usesZip64Offset ? Buffer.alloc(12) : Buffer.alloc(0);
    if (usesZip64Offset) {
      zip64Extra.writeUInt16LE(0x0001, 0);
      zip64Extra.writeUInt16LE(8, 2);
      zip64Extra.writeBigUInt64LE(BigInt(entry.offset), 4);
    }

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(usesZip64Offset ? 0x032d : 0x0314, 4);
    centralHeader.writeUInt16LE(usesZip64Offset ? ZIP64_VERSION : 20, 6);
    centralHeader.writeUInt16LE(entry.flags, 8);
    centralHeader.writeUInt16LE(entry.method, 10);
    centralHeader.writeUInt16LE(entry.time, 12);
    centralHeader.writeUInt16LE(entry.date, 14);
    centralHeader.writeUInt32LE(entry.crc, 16);
    centralHeader.writeUInt32LE(entry.size, 20);
    centralHeader.writeUInt32LE(entry.size, 24);
    centralHeader.writeUInt16LE(entry.filenameBytes.length, 28);
    centralHeader.writeUInt16LE(zip64Extra.length, 30);
    centralHeader.writeUInt32LE(
      usesZip64Offset ? MAX_ZIP32_VALUE : entry.offset,
      42
    );

    chunks.push(centralHeader, entry.filenameBytes, zip64Extra);
    offset += centralHeader.length + entry.filenameBytes.length + zip64Extra.length;
  }

  const centralDirectorySize = offset - centralDirectoryOffset;
  const usesZip64Archive =
    entries.length > MAX_ZIP16_VALUE ||
    centralDirectoryOffset > MAX_ZIP32_VALUE ||
    centralDirectorySize > MAX_ZIP32_VALUE;

  if (usesZip64Archive) {
    const zip64EndOffset = offset;
    const zip64End = Buffer.alloc(56);
    zip64End.writeUInt32LE(0x06064b50, 0);
    zip64End.writeBigUInt64LE(44n, 4);
    zip64End.writeUInt16LE(ZIP64_VERSION, 12);
    zip64End.writeUInt16LE(ZIP64_VERSION, 14);
    zip64End.writeBigUInt64LE(BigInt(entries.length), 24);
    zip64End.writeBigUInt64LE(BigInt(entries.length), 32);
    zip64End.writeBigUInt64LE(BigInt(centralDirectorySize), 40);
    zip64End.writeBigUInt64LE(BigInt(centralDirectoryOffset), 48);
    chunks.push(zip64End);
    offset += zip64End.length;

    const zip64Locator = Buffer.alloc(20);
    zip64Locator.writeUInt32LE(0x07064b50, 0);
    zip64Locator.writeBigUInt64LE(BigInt(zip64EndOffset), 8);
    zip64Locator.writeUInt32LE(1, 16);
    chunks.push(zip64Locator);
    offset += zip64Locator.length;
  }

  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(
    usesZip64Archive ? MAX_ZIP16_VALUE : entries.length,
    8
  );
  endRecord.writeUInt16LE(
    usesZip64Archive ? MAX_ZIP16_VALUE : entries.length,
    10
  );
  endRecord.writeUInt32LE(
    usesZip64Archive ? MAX_ZIP32_VALUE : centralDirectorySize,
    12
  );
  endRecord.writeUInt32LE(
    usesZip64Archive ? MAX_ZIP32_VALUE : centralDirectoryOffset,
    16
  );
  chunks.push(endRecord);
  offset += endRecord.length;

  return { chunks, finalOffset: offset, usesZip64Archive };
}
