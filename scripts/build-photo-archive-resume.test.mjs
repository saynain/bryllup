import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);

test("resumes an interrupted original with a byte range", async () => {
  const payload = Buffer.alloc(1024 * 1024, 0x5a);
  const interruptedAt = 256 * 1024;
  let fileRequests = 0;

  const server = createServer((request, response) => {
    if (request.url?.startsWith("/media")) {
      const baseUrl = `http://127.0.0.1:${server.address().port}`;
      response.setHeader("Content-Type", "application/json");
      response.end(
        JSON.stringify({
          photos: [
            {
              downloadUrl: `${baseUrl}/file`,
              filename: "resume-test.jpg",
              mediaType: "image",
              mimeType: "image/jpeg",
              originalName: "resume-test.jpg",
              status: "ready",
              uploadedAt: "2026-08-20T00:00:00.000Z",
            },
          ],
          hasMore: false,
        })
      );
      return;
    }

    if (request.url === "/file") {
      fileRequests += 1;
      const range = request.headers.range;
      if (!range && fileRequests === 1) {
        response.writeHead(200, { "Content-Length": payload.length });
        response.write(payload.subarray(0, interruptedAt));
        setTimeout(() => response.destroy(), 10);
        return;
      }

      const start = Number(range?.match(/^bytes=(\d+)-$/)?.[1]);
      assert.equal(start, interruptedAt);
      response.writeHead(206, {
        "Content-Length": payload.length - start,
        "Content-Range": `bytes ${start}-${payload.length - 1}/${payload.length}`,
      });
      response.end(payload.subarray(start));
      return;
    }

    response.writeHead(404).end();
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const directory = await mkdtemp(path.join(tmpdir(), "bryllup-archive-resume-"));
  const output = path.join(directory, "resume.zip");

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const result = await execFileAsync(
      process.execPath,
      [
        "scripts/build-photo-archive.mjs",
        "--api-url",
        baseUrl,
        "--type",
        "photos",
        "--output",
        output,
      ],
      { cwd: process.cwd() }
    );

    assert.match(result.stderr, /fortsetter fra siste byte/);
    assert.equal(fileRequests, 2);
    await execFileAsync("unzip", ["-t", output]);
  } finally {
    server.close();
    await rm(directory, { force: true, recursive: true });
  }
});
