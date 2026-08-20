# Cloudflare Media Worker

This Worker backs the mobile-first wedding media upload flow while the Next.js
site continues to run on Vercel.

## Architecture

- D1 stores media metadata and gallery pagination state.
- R2 stores photo originals. The Images binding creates cached 480 px WebP
  thumbnails and 1600 px WebP previews when they are first requested.
- R2 is also the fallback backend for large videos.
- Video uploads use Cloudflare Stream when REST credentials or the Stream
  binding can create a direct upload. R2 multipart is the fallback for larger
  files and Stream failures. Large speeches are uploaded in 5 MiB retryable
  parts instead of one long fragile request when R2 is used.
- R2-backed videos can store a client-generated JPEG thumbnail next to the
  original video object.
- Optional REST credentials also enable Cloudflare Images Direct Creator Upload.

The checked-in Worker config currently forces `STREAM_UPLOAD_PROTOCOL` to
`r2-multipart` because the Cloudflare account has zero allocated Stream minutes.
Switch it back to `auto` after Stream capacity is enabled.

## Provisioning

```bash
npx wrangler r2 bucket create bryllup-media
npx wrangler d1 create bryllup-media
```

Copy the `database_id` from the D1 create output into `wrangler.toml`, then run:

```bash
npx wrangler d1 migrations apply bryllup-media --remote --config cloudflare/media-worker/wrangler.toml
```

Optional: for Images Direct Creator Upload and TUS video uploads, add a
Cloudflare API token with permission to create Images and Stream uploads:

```bash
npx wrangler secret put CLOUDFLARE_API_TOKEN --config cloudflare/media-worker/wrangler.toml
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --config cloudflare/media-worker/wrangler.toml
```

Then deploy:

```bash
npx wrangler deploy --config cloudflare/media-worker/wrangler.toml
```

Set this on Vercel after deployment:

```bash
NEXT_PUBLIC_MEDIA_API_URL=https://bryllup-media.<your-subdomain>.workers.dev
```

## Samlet nedlasting av bilder og videoer

Worker-endepunktene `/downloads/photos.zip` og `/downloads/videos.zip` bygger
ZIP-strømmen direkte fra de aktive originalfilene i R2. Det lagres derfor ikke
en ekstra kopi på mange gigabyte som må bygges på nytt hver gang biblioteket
endres.

CRC32 beregnes mens hver original allerede strømmes til brukeren og skrives i en
ZIP data descriptor etter filinnholdet. Dermed trengs ingen engangsindeksering,
manifestjobb eller lokal nedlasting. Slettede filer forsvinner og nye filer blir
tilgjengelige umiddelbart fordi innholdet alltid hentes fra D1. Videoarkivet
bruker ZIP64 når det eller en enkelt videofil passerer 4 GiB.

For å bygge et lokalt kontrollarkiv uten opplasting kan du bruke `--type photos`
eller `--type videos`:

```bash
node --env-file=.env.local scripts/build-photo-archive.mjs --type photos
```

Galleriet kan også lage en ZIP-fil direkte fra opptil 100 valgte bilder og
videoer via `/downloads/selected.zip?ids=...`. Workeren strømmer originalene rett
fra R2 og beregner kontrollsummene underveis, slik at store utvalg ikke må lastes
inn i minnet først.
