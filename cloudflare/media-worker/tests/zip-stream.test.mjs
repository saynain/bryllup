import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import {
  createStreamingZipCentralDirectory,
  createStreamingZipDataDescriptor,
  createStreamingZipLayout,
} from "../src/zip-stream.ts";

const execFileAsync = promisify(execFile);

test("creates a stored ZIP that writes CRC after the file data", () => {
  const layout = createStreamingZipLayout([
    { filename: "Bilder/test.jpg", size: 1024 },
  ]);
  const entry = layout.entries[0];
  const descriptor = createStreamingZipDataDescriptor(entry, 0x12345678);
  const centralDirectory = createStreamingZipCentralDirectory(layout, [0x12345678]);

  assert.equal(layout.usesZip64, false);
  assert.equal(entry.localHeader.length, 30 + "Bilder/test.jpg".length);
  assert.equal(new DataView(entry.localHeader.buffer).getUint16(6, true) & 0x0008, 0x0008);
  assert.equal(new DataView(entry.localHeader.buffer).getUint32(14, true), 0);
  assert.equal(new DataView(descriptor.buffer).getUint32(4, true), 0x12345678);
  assert.equal(centralDirectory.at(-1)[0], 0x50);
  assert.equal(
    layout.contentLength,
    entry.localHeader.length + 1024 + 16 + 46 + "Bilder/test.jpg".length + 22
  );
});

test("uses ZIP64 after selected contents pass 4 GiB", () => {
  const layout = createStreamingZipLayout([
    { filename: "Videoer/one.mov", size: 3_000_000_000 },
    { filename: "Videoer/two.mov", size: 2_000_000_000 },
  ]);
  const centralDirectory = createStreamingZipCentralDirectory(layout, [1, 2]);

  assert.equal(layout.usesZip64, true);
  assert.equal(centralDirectory.at(-3)[0], 0x50);
  assert.equal(centralDirectory.at(-3)[1], 0x4b);
  assert.equal(centralDirectory.at(-3)[2], 0x06);
  assert.equal(centralDirectory.at(-3)[3], 0x06);
});

test("uses a ZIP64 data descriptor for an individual file over 4 GiB", () => {
  const layout = createStreamingZipLayout([
    { filename: "Videoer/lang.mov", size: 5_000_000_000 },
  ]);
  const descriptor = createStreamingZipDataDescriptor(layout.entries[0], 123);

  assert.equal(layout.entries[0].usesZip64Size, true);
  assert.equal(descriptor.length, 24);
  assert.equal(new DataView(descriptor.buffer).getBigUint64(8, true), 5_000_000_000n);
});

test("produces an archive accepted by unzip", async () => {
  const contents = Buffer.from("hei fra bryllupet\n", "utf8");
  const checksum = crc32(contents);
  const layout = createStreamingZipLayout([
    {
      filename: "Silje og Sindre - Utvalg/minne.txt",
      size: contents.length,
    },
  ]);
  const archive = Buffer.concat([
    Buffer.from(layout.entries[0].localHeader),
    contents,
    Buffer.from(createStreamingZipDataDescriptor(layout.entries[0], checksum)),
    ...createStreamingZipCentralDirectory(layout, [checksum]).map((chunk) =>
      Buffer.from(chunk)
    ),
  ]);
  assert.equal(archive.length, layout.contentLength);
  const directory = await mkdtemp(path.join(os.tmpdir(), "bryllup-selected-zip-"));
  const archivePath = path.join(directory, "utvalg.zip");

  try {
    await writeFile(archivePath, archive);
    const result = await execFileAsync("unzip", ["-t", archivePath]);
    assert.match(result.stdout, /No errors detected/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
