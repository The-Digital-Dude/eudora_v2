# Deploying Eudora

Two services and a database, all on Railway: `api-service`, `client`, and
Postgres. Both services build from their own `Dockerfile` via the `railway.json`
beside it.

There is no second target. Netlify used to host the client alone, which could
never work once the marketing page started calling the API — it deployed half
the system and never set `NEXT_PUBLIC_API_URL`, so every browser call went to
`localhost`. That config has been removed.

The GitHub Actions pipeline can deploy to Cloud Run instead, but it is switched
off (`GCP_DEPLOY_ENABLED`) and stays that way unless someone deliberately moves
back.

## Database

Nothing to run by hand. The API container starts with:

```
npx prisma migrate deploy && node dist/src/main
```

so a fresh Postgres gets the whole migration chain on first boot, and each later
deploy applies whatever is new. A deploy that cannot migrate fails to start
rather than serving against a schema it does not match.

The database is **not** seeded. A fresh one has no admin user — create the first
one directly, or run `prisma/seed.ts` once against it.

## API service — environment

**Required.** Missing any of these and the service is broken, not degraded.

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Railway injects this from the Postgres plugin. |
| `JWT_SECRET` | Every session is signed with it. Changing it logs everyone out. |
| `CORS_ORIGINS` | Comma-separated, must include the client's public URL exactly. Defaults to `http://localhost:3000`, so leaving it unset makes the deployed client fail every request. |
| `APP_URL` | Used to build links in outgoing email. |

**Storage — required in any deployed environment.**

`STORAGE_PROVIDER` defaults to `LOCAL`, which writes to the container's own
disk. Every host here has an ephemeral filesystem, so uploaded files and
generated narration disappear on the next restart. Set it to `S3` and give it
somewhere real to write:

| Variable | Notes |
| --- | --- |
| `STORAGE_PROVIDER` | `S3`. |
| `S3_BUCKET` | Public bucket, for course artwork and other readable files. |
| `S3_PRIVATE_BUCKET` | Narration, homework attachments, application CVs. Falls back to `S3_BUCKET`, which would make those readable by URL — set it. |
| `S3_ENDPOINT` | Any S3-compatible host: Supabase Storage, R2, B2, AWS. |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | |
| `S3_PUBLIC_URL` | Where public objects are served from. Also read by the client at build time. |
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

## Client — environment

`NEXT_PUBLIC_*` values are compiled into the browser bundle, so they must reach
the image as **build arguments**, not runtime variables. This is the one that
bites: setting them only at runtime leaves the deployed bundle calling
`localhost` from the visitor's browser, and the page looks fine until something
actually fetches. The Dockerfile declares each as an `ARG`. Railway passes
service variables through as build args on its own; on a host that does not,
pass them explicitly with `--build-arg`.

`NEXT_PUBLIC_API_URL` is worth checking after any deploy rather than assuming —
grep the built bundle for the value, or open the site and watch one network
call.

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | The API service's public URL, no trailing slash. |
| `NEXT_PUBLIC_SITE_URL` | The client's own public URL, used in metadata and the sitemap. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Only for Google sign-in. |
| `S3_PUBLIC_URL` | Not `NEXT_PUBLIC_`: read by `next.config.ts` to allowlist the image host. Without it, uploaded images are served unoptimised. |

## Order

1. Postgres first, so `DATABASE_URL` exists.
2. API second. It migrates on boot; watch the log for the migration list and
   for the storage backend line, which prints `LOCAL` or `S3`.
3. Client last, once the API has a URL to point at.
4. Set `CORS_ORIGINS` on the API to the client's URL and redeploy the API.

Step 4 is separate because it is circular: the client needs the API's URL to
build, and the API needs the client's URL to accept its requests.

## Checking it worked

```bash
curl -s https://<api>/api/health
curl -s https://<api>/api/stories/demo | head -c 200   # the public story, no auth
curl -s -o /dev/null -w '%{http_code}\n' https://<client>/about-eudora
```

The last one must be a real page. A `200` carrying a "This page could not be
found" body means the route is not being served at all — that was the Netlify
failure, and it is worth checking for explicitly because the status code alone
looks healthy.
