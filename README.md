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

### Private resume integration

The CV workflow uses Next.js Route Handlers as a backend-for-frontend. Configure
these variables in every Vercel environment that should support uploads:

```bash
JOB_SEARCH_API_BASE_URL=<Lambda Function URL>
JOB_SEARCH_DOCUMENT_CLIENT_SECRET=<job-search document client secret>
```

`JOB_SEARCH_DOCUMENT_CLIENT_SECRET` is server-only and must never be renamed
with a `NEXT_PUBLIC_` prefix. `JOB_SEARCH_API_BASE_URL` falls back to
`NEXT_PUBLIC_API_BASE_URL` on the server, but the explicit private name is
recommended. The browser calls only `/api/resume/*`; the exception is the
presigned PDF `PUT`, which goes directly to S3 with the signed headers.

The page restores the latest resume document for the selected profile after a
refresh, polls non-terminal documents, and requires explicit section selection
before apply. Apply semantics are:

- full name, headline, summary, and location: replace only when selected and
  the CV contains a non-empty value;
- skills: merge and deduplicate case-insensitively;
- experience and education: replace their professional section and deduplicate
  repeated extracted entries;
- languages: merge by language, with the selected CV level taking precedence;
- certifications: merge and deduplicate by name and issuer.

Email, phone, LinkedIn, and GitHub are displayed during review but are not
currently persisted because the selected Radar profile model has no supported
contact fields. True per-user authentication is still future work; P1C keeps
tenant and source scope server-side and uses the existing private client
credential.

The frontend uses these endpoints:

- `GET /radar/profiles`
- `GET /radar/opportunities?profile_id=...`
- `POST /radar/runs`
- `PUT /radar/opportunities/{opportunity_id}/feedback`

Search requests are manual and are never retried automatically.

## Validation

```bash
pnpm test
pnpm lint
pnpm build
```
