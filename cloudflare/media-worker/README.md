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

## Samlet bildenedlasting

Worker-endepunktet `/downloads/photos.zip` strømmer et ferdig ZIP-arkiv fra R2.
Bygg og last opp et nytt arkiv etter at galleriet er oppdatert:

```bash
pnpm cf:media:archive
```

Kommandoen henter bare originalbilder (ikke videoer), lager ZIP-filen lokalt under
`output/media-archive/`, og laster den opp til R2 i 20 MiB-deler. Den bruker
`NEXT_PUBLIC_MEDIA_API_URL` fra `.env.local`. Hvis et lokalt opplastingstoken ikke
finnes, oppretter den et separat `ARCHIVE_UPLOAD_TOKEN` som en Worker-hemmelighet;
tokenet blir bare holdt i minnet mens arkivet lastes opp.
