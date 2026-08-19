import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

const apiUrl = (process.env.NEXT_PUBLIC_MEDIA_API_URL || "").replace(/\/$/, "");
if (!apiUrl) {
  throw new Error("Mangler NEXT_PUBLIC_MEDIA_API_URL i .env.local.");
}

const options = parseArguments(process.argv.slice(2));
const token = process.env.MIGRATION_TOKEN || (await configureMigrationSecret());
const deadline = Date.now() + options.timeoutMinutes * 60_000;

let inventory = await listMigrations(token);
let candidates = inventory.videos.filter(
  (video) =>
    video.provider !== "cloudflare-stream" || video.migrationStatus !== "complete"
);
if (options.limit) {
  candidates = candidates.slice(0, options.limit);
}

if (candidates.length === 0) {
  console.log("Alle videoer er allerede migrert til Stream.");
  process.exit(0);
}

console.log(`Migrerer ${candidates.length} videoer til Cloudflare Stream …`);

const notStarted = candidates.filter((video) => video.migrationStatus === "not-started");
if (notStarted.length > 0) {
  const canary = [...notStarted].sort((a, b) => a.size - b.size)[0];
  console.log(`Starter kontrollvideo: ${canary.originalName}`);
  await startMigration(token, canary);
  await waitForComplete(token, [canary.id]);
  console.log("Kontrollvideoen er klar. Starter resten …");

  const rest = notStarted.filter((video) => video.id !== canary.id);
  await mapConcurrent(rest, 3, async (video, index) => {
    await startMigration(token, video);
    console.log(`[${index + 1}/${rest.length}] startet: ${video.originalName}`);
  });
}

await waitForComplete(
  token,
  candidates.map((video) => video.id)
);

inventory = await listMigrations(token);
const selected = inventory.videos.filter((video) =>
  candidates.some((candidate) => candidate.id === video.id)
);
const failed = selected.filter((video) => video.migrationStatus === "error");
if (failed.length > 0) {
  throw new Error(
    `${failed.length} videoer feilet: ${failed.map((video) => video.originalName).join(", ")}`
  );
}

console.log(`Ferdig: ${selected.length} videoer bruker nå Cloudflare Stream.`);
console.log("R2-originalene er beholdt for trygg nedlasting og eventuell tilbakeføring.");

async function configureMigrationSecret() {
  const value = randomBytes(32).toString("hex");
  console.log("Oppretter et midlertidig vedlikeholdstoken for Stream-migreringen …");

  await new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      [
        "--yes",
        "wrangler@latest",
        "secret",
        "put",
        "MIGRATION_TOKEN",
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
    child.stdin.end(value);
  });

  console.log("Venter på at den nye Worker-versjonen blir aktiv …");
  for (let attempt = 1; attempt <= 12; attempt++) {
    await delay(5_000);
    const response = await fetch(`${apiUrl}/admin/stream-migrations`, {
      headers: authHeaders(value),
    });
    if (response.ok) {
      // Secret deployments can briefly be inconsistent across edge locations.
      await delay(5_000);
      return value;
    }
  }
  throw new Error("Det nye migreringstokenet ble ikke aktivt innen ett minutt.");
}

async function listMigrations(authToken) {
  return requestJson(`${apiUrl}/admin/stream-migrations`, {
    headers: authHeaders(authToken),
  });
}

async function startMigration(authToken, video) {
  try {
    return await requestJson(
      `${apiUrl}/admin/stream-migrations/${encodeURIComponent(video.id)}`,
      { method: "POST", headers: authHeaders(authToken) }
    );
  } catch (error) {
    if (/quota|storage|capacity|minutes/i.test(error.message)) {
      throw new Error(
        "Cloudflare Stream har ikke aktiv lagringskapasitet. Aktiver 1 000 minutter til 5 USD og kjør kommandoen på nytt."
      );
    }
    throw error;
  }
}

async function finalizeMigration(authToken, videoId) {
  return requestJson(
    `${apiUrl}/admin/stream-migrations/${encodeURIComponent(videoId)}/finalize`,
    { method: "POST", headers: authHeaders(authToken) },
    { acceptedStatuses: [202, 422] }
  );
}

async function waitForComplete(authToken, videoIds) {
  const remaining = new Set(videoIds);
  while (remaining.size > 0) {
    if (Date.now() > deadline) {
      throw new Error(`Tidsavbrudd med ${remaining.size} videoer igjen.`);
    }

    const results = await mapConcurrent([...remaining], 5, async (id) => ({
      id,
      result: await finalizeMigration(authToken, id),
    }));

    for (const { id, result } of results) {
      if (result.status === "complete") {
        remaining.delete(id);
      } else if (result.error) {
        throw new Error(`Stream-behandling feilet for ${id}: ${result.error}`);
      }
    }

    console.log(`${videoIds.length - remaining.size}/${videoIds.length} videoer klare`);
    if (remaining.size > 0) {
      await delay(options.pollSeconds * 1000);
    }
  }
}

async function requestJson(url, init = {}, options = {}) {
  const accepted = new Set([200, 201, 202, ...(options.acceptedStatuses || [])]);
  let lastError;

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const response = await fetch(url, init);
      const payload = await response.json().catch(() => null);
      if (accepted.has(response.status)) {
        return payload || {};
      }

      const error = new Error(
        payload?.error || `Forespørselen feilet med HTTP ${response.status}`
      );
      if (
        (response.status < 500 && response.status !== 401 && response.status !== 429) ||
        /quota|storage|capacity|minutes/i.test(error.message)
      ) {
        throw Object.assign(error, { retryable: false });
      }
      lastError = error;
    } catch (error) {
      if (error?.retryable === false) throw error;
      lastError = error;
    }

    if (attempt < 5) await delay(attempt * 1500);
  }

  throw lastError;
}

async function mapConcurrent(values, concurrency, mapper) {
  const results = new Array(values.length);
  let next = 0;
  async function worker() {
    while (next < values.length) {
      const index = next++;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

function authHeaders(authToken) {
  return { "X-Upload-Token": authToken };
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function parseArguments(values) {
  const parsed = { limit: undefined, pollSeconds: 15, timeoutMinutes: 45 };
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    if (value === "--limit") {
      parsed.limit = positiveNumber(values[++index], "--limit");
    } else if (value === "--poll-seconds") {
      parsed.pollSeconds = positiveNumber(values[++index], "--poll-seconds");
    } else if (value === "--timeout-minutes") {
      parsed.timeoutMinutes = positiveNumber(values[++index], "--timeout-minutes");
    } else {
      throw new Error(`Ukjent argument: ${value}`);
    }
  }
  return parsed;
}

function positiveNumber(value, option) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${option} krever et positivt tall.`);
  }
  return number;
}
