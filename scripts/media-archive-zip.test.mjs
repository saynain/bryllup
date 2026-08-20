import assert from "node:assert/strict";
import test from "node:test";
import {
  createZipCentralDirectory,
  MAX_ZIP32_VALUE,
} from "./media-archive-zip.mjs";

function entry(offset) {
  return {
    crc: 0x12345678,
    date: 0,
    filenameBytes: Buffer.from("video.mov"),
    flags: 0x0808,
    method: 0,
    offset,
    size: 1024,
    time: 0,
  };
}

test("writes ordinary ZIP32 central-directory offsets", () => {
  const result = createZipCentralDirectory([entry(123)], 2048);
  const header = result.chunks[0];

  assert.equal(result.usesZip64Archive, false);
  assert.equal(header.readUInt16LE(6), 20);
  assert.equal(header.readUInt16LE(30), 0);
  assert.equal(header.readUInt32LE(42), 123);
  assert.equal(result.chunks.at(-1).readUInt32LE(0), 0x06054b50);
});

test("writes ZIP64 offsets and end records beyond 4 GiB", () => {
  const largeOffset = MAX_ZIP32_VALUE + 1234;
  const result = createZipCentralDirectory(
    [entry(largeOffset)],
    MAX_ZIP32_VALUE + 4096
  );
  const [header, , extra] = result.chunks;

  assert.equal(result.usesZip64Archive, true);
  assert.equal(header.readUInt16LE(6), 45);
  assert.equal(header.readUInt16LE(30), 12);
  assert.equal(header.readUInt32LE(42), MAX_ZIP32_VALUE);
  assert.equal(extra.readUInt16LE(0), 0x0001);
  assert.equal(extra.readUInt16LE(2), 8);
  assert.equal(extra.readBigUInt64LE(4), BigInt(largeOffset));
  assert.equal(result.chunks.at(-3).readUInt32LE(0), 0x06064b50);
  assert.equal(result.chunks.at(-2).readUInt32LE(0), 0x07064b50);
  assert.equal(result.chunks.at(-1).readUInt32LE(0), 0x06054b50);
});
