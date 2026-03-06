This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## D1 Database

The project uses Cloudflare D1 for structured data (countries, regions, downloadable file metadata).

### Setup

```bash
# 1. Create the D1 database
wrangler d1 create trueroute-d1

# 2. Update wrangler.toml with the database_id from step 1

# 3. Apply migrations
wrangler d1 migrations apply trueroute-d1
```

### Seeding

The seed script reads an `index.json` file and generates idempotent SQL:

```bash
# Generate seed SQL from index.json
npx tsx scripts/seed-d1.ts scripts/sample-index.json > seed.sql

# Apply to local D1
wrangler d1 execute trueroute-d1 --local --file=seed.sql

# Apply to remote D1
wrangler d1 execute trueroute-d1 --remote --file=seed.sql
```

The script is idempotent — safe to re-run. It deletes existing data for the country and re-inserts within a transaction.

## Data Pipeline

`scripts/pipeline.sh` is the master orchestrator. It runs three stages in order:

| Stage | What it does |
|-------|-------------|
| **BUILD** | Compiles per-region files (PMTiles + geocode SQLite + POI GeoJSON) and uploads to R2 |
| **INDEX** | Generates `index.json` + `checksums.json` from R2 assets and uploads both |
| **D1** | Downloads the fresh `index.json`, generates seed SQL, applies to Cloudflare D1 |

### Required environment variables

```bash
export R2_ENDPOINT_URL="https://<account>.r2.cloudflarestorage.com"
export R2_ACCESS_KEY_ID="<key>"
export R2_SECRET_ACCESS_KEY="<secret>"
# Optional:
export R2_BUCKET_NAME="trueroute-data"       # default
export CDN_BASE_URL="https://data.trueroute.app"  # default
export D1_DATABASE_NAME="trueroute-d1"       # default
```

### Common commands

```bash
# Full run — build all 26 Ukrainian oblasts, update index, seed D1
./scripts/pipeline.sh

# Build a single region only (faster for testing)
./scripts/pipeline.sh --region lviv

# Re-index + seed D1 without rebuilding files (files already in R2)
./scripts/pipeline.sh --skip-build

# Build + index only, skip D1 update
./scripts/pipeline.sh --skip-d1

# Seed D1 from the current index.json already in R2 (no build, no re-index)
./scripts/pipeline.sh --d1-only

# Preview the plan without making any changes
./scripts/pipeline.sh --dry-run
./scripts/pipeline.sh --region kyiv-oblast --dry-run
```

### Individual scripts

If you need to run a single stage manually:

```bash
# Build one region → R2
./scripts/build-region.sh lviv

# Build all regions → R2
./scripts/build-all-regions.sh

# Generate index.json + checksums.json → R2
./scripts/generate-index.sh

# Seed D1 from a local index.json
npx tsx scripts/seed-d1.ts path/to/index.json > seed.sql
wrangler d1 execute trueroute-d1 --remote --file=seed.sql
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
