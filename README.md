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

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## API configuration

The frontend reads the backend base URL from `NEXT_PUBLIC_API_BASE_URL`.

For local development, create or update `.env.local` in the project root:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

For Vercel production, set this environment variable in the Vercel project settings:

```bash
NEXT_PUBLIC_API_BASE_URL=https://jo-4d640afb7d8a498ba98b7048af302d6c.ecs.sa-east-1.on.aws
```

The app keeps the endpoint paths unchanged and appends them to the configured base URL:

- `GET /radar/profiles`
- `POST /radar/runs`

If the deployed frontend cannot call the AWS backend, check the backend CORS allowlist and add the Vercel deployment URL.
