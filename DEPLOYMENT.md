# Deploying Eudora

Two hosts:

- **Render** — the API service and Postgres.
- **Netlify** — the client, built from `netlify.toml`.

They are separate origins, so two variables have to agree or the site loads and
then fails on its first request: the client needs the API's URL baked in, and
the API needs the client's origin in its CORS allowlist. Neither failure shows
up as a broken build.

The GitHub Actions pipeline can deploy to Cloud Run instead. It is switched off
behind `GCP_DEPLOY_ENABLED` and stays that way unless someone deliberately
moves back. Railway config files remain but nothing deploys from them.

## Database

Nothing to run by hand. The API container starts with:

```
npx prisma migrate deploy && node dist/src/main
```

so a fresh Postgres gets the whole migration chain on first boot, and each
later deploy applies whatever is new. A deploy that cannot migrate fails to
start rather than serving against a schema it does not match.

The database is **not** seeded. A fresh one has no admin user — create the first
one directly, or run `prisma/seed.ts` once against it.

## API (Render) — environment

**Required.** Missing any of these and the service is broken, not degraded.

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | From the Render Postgres instance. |
| `JWT_SECRET` | Every session is signed with it. Changing it logs everyone out. |
| `CORS_ORIGINS` | Comma-separated, and must contain the Netlify origin exactly — scheme included, no trailing slash. Defaults to `http://localhost:3000`, so leaving it unset makes every browser call from the deployed client fail. |
| `APP_URL` | Used to build links in outgoing email. |

**Storage — required in any deployed environment.**

`STORAGE_PROVIDER` defaults to `LOCAL`, which writes to the container's own
disk. Render's filesystem is ephemeral, so uploaded files and generated
narration disappear on the next deploy or restart. Set it to `S3` and give it
somewhere real to write:

| Variable | Notes |
| --- | --- |
| `STORAGE_PROVIDER` | `S3`. |
| `S3_BUCKET` | Public bucket, for course artwork and other readable files. |
| `S3_PRIVATE_BUCKET` | Narration, homework attachments, application CVs. Falls back to `S3_BUCKET`, which would make those readable by URL — set it. |
| `S3_ENDPOINT` | Any S3-compatible host: Supabase Storage, R2, B2, AWS. |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | |
| `S3_PUBLIC_URL` | Where public objects are served from. Also needed by the client at build time. |
| `S3_REGION` | Defaults to `auto`, which suits R2 and Supabase. |

**The story module.** Without these, narration and the voice agent return 503
and the rest of the app carries on.

| Variable | Notes |
| --- | --- |
| `ELEVEN_LABS_API_KEY` | Underscores between `ELEVEN` and `LABS`. |
| `GEMINI_API_KEY` | |
| `GEMINI_CHAT_MODEL` | The free tier allows **20 requests per day per model**, so a day's use exhausts one. Switching this to another model is how you get a fresh allowance. |
| `ELEVENLABS_VOICE_ID` | Defaults to Alice, a free premade British voice. Sophia (`jB2lPb5DhAX6l1TLkKXy`) is a library voice and needs a paid plan. |
| `STORY_DEMO_MAX_TURNS`, `STORY_DEMO_MAX_TURNS_PER_DAY` | Caps on the public demo. Default 8 and 300. |

**Optional.** Each degrades on its own and says so in the log at boot.

`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (checkout), `RESEND_API_KEY`
and `EMAIL_FROM` (password reset cannot work without them), the `APPLE_*` and
`GOOGLE_CLIENT_ID` sign-in keys.

## Client (Netlify) — environment

Set these in Netlify's environment variables, not in a file. `NEXT_PUBLIC_*`
values are compiled into the browser bundle during the build, so a change to
any of them needs a fresh deploy — editing the variable alone does nothing to
the already-built bundle.

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | The Render API's public URL, no trailing slash. Unset, it falls back to localhost and every call fails from the visitor's browser. |
| `NEXT_PUBLIC_SITE_URL` | The Netlify URL, used in metadata and the sitemap. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Only for Google sign-in. |
| `S3_PUBLIC_URL` | Not `NEXT_PUBLIC_`: read by `next.config.ts` at build time to allowlist the image host. Without it, uploaded images are served unoptimised. |

`netlify.toml` holds the build settings deliberately, so they are versioned
rather than living in the dashboard where they drift. Two things in it are
load-bearing: `publish = ".next"` relative to `base = "client"`, and the
`@netlify/plugin-nextjs` plugin, which is what serves SSR routes. Without the
plugin Netlify treats the build output as a static directory and returns a 404
for every route while the build still reports success.

`next.config.ts` sets `output: "standalone"` only when `NETLIFY` is unset,
because the Netlify runtime cannot serve a standalone layout — same silent
all-routes-404. Standalone is for the Dockerfile, which is what runs locally.

## Order

1. Postgres first, so `DATABASE_URL` exists.
2. API second. Watch the boot log for the migration list and for the storage
   backend line, which prints `LOCAL` or `S3`.
3. Client third, with `NEXT_PUBLIC_API_URL` already set.
4. Add the Netlify origin to `CORS_ORIGINS` on the API and redeploy the API.

Step 4 is separate because it is circular: the client needs the API's URL to
build, and the API needs the client's origin before it will answer it.

## Checking it worked

```bash
curl -s https://<api>/api/health
curl -s https://<api>/api/stories/demo | head -c 200    # public story, no auth
curl -s -o /dev/null -w '%{http_code}\n' https://<client>/about-eudora
```

The last one must be a real page. A `200` carrying a "This page could not be
found" body means routes are not being served at all — the status code alone
looks healthy, which is how that failure went unnoticed before.

Then open the site and watch one network call: confirm it goes to the Render
API and not to `localhost`. That is the check that catches a missing
`NEXT_PUBLIC_API_URL`, and nothing else will.
