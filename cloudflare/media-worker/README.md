# Cloudflare Media Worker

This Worker backs the mobile-first wedding media upload flow while the Next.js
site continues to run on Vercel.

## Architecture

- D1 stores media metadata and gallery pagination state.
- Cloudflare Images hosted upload is used for photos through the Images binding.
- R2 stores original files when Images or Stream is not configured.
- Cloudflare Stream direct upload is used for videos through the Stream binding.
- Optional REST credentials can enable Cloudflare Images Direct Creator Upload
  and TUS uploads for larger videos.

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
