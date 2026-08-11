# Job Radar frontend

Next.js frontend for manually searching and reviewing Job Radar opportunities.

## Local development

Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## API configuration

The browser API client reads `NEXT_PUBLIC_API_BASE_URL`. The value is embedded in the client bundle when Next.js builds the application.

For a local FastAPI backend, create or update `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

For Vercel, set the variable in every environment that should call the deployed backend:

```bash
NEXT_PUBLIC_API_BASE_URL=<Lambda Function URL>
```

Rebuild and redeploy the frontend after changing a `NEXT_PUBLIC_` variable. The FastAPI CORS allowlist must also include the exact Vercel frontend origin.

The frontend uses these endpoints:

- `GET /radar/profiles`
- `GET /radar/opportunities?profile_id=...`
- `POST /radar/runs`
- `PUT /radar/opportunities/{opportunity_id}/feedback`

Search requests are manual and are never retried automatically.

## Validation

```bash
pnpm lint
pnpm build
```
