# Next.js on Netlify Platform Starter

[Live Demo](https://nextjs-platform-starter.netlify.app/)

A modern starter based on Next.js 16 (App Router), Tailwind, and [Netlify Core Primitives](https://docs.netlify.com/core/overview/#develop) (Edge Functions, Image CDN, Blob Store).

In this site, Netlify Core Primitives are used both implictly for running Next.js features (e.g. Route Handlers, image optimization via `next/image`, and more) and also explicitly by the user code.

Implicit usage means you're using any Next.js functionality and everything "just works" when deployed - all the plumbing is done for you. Explicit usage is framework-agnostic and typically provides more features than what Next.js exposes.

## Deploying to Netlify

Click the button below to deploy this template to your Netlify account.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/netlify-templates/next-platform-starter)

## Developing Locally

1. Clone this repository, then run `npm install` in its root directory.

2. For the starter to have full functionality locally (e.g. edge functions, blob store), please ensure you have an up-to-date version of Netlify CLI. Run:

```
npm install netlify-cli@latest -g
```

3. Link your local repository to the deployed Netlify site. This will ensure you're using the same runtime version for both local development and your deployed site.

```
netlify link
```

4. Then, run the Next.js development server via Netlify CLI:

```
netlify dev
```

If your browser doesn't navigate to the site automatically, visit [localhost:8888](http://localhost:8888).

5. Copy `.env.example` to `.env.local` and fill in the values below. `netlify dev` and `next dev` both load `.env.local`.

## Authentication

Sign-in is a single shared username and password checked on the server. The browser only posts the form to `/api/auth/login`. It never receives the expected password or the signing secret.

Set these in Netlify under **Site configuration → Environment variables**. Do not prefix them with `NEXT_PUBLIC_` — that prefix is copied into the browser bundle.

| Variable | Purpose |
| --- | --- |
| `AUTH_USERNAME` | Shared login username |
| `AUTH_PASSWORD` | Shared login password |
| `AUTH_SECRET` | HMAC key for the session cookie. Generate one with `openssl rand -base64 32` |

When you add each variable, include the **Functions** scope so the login route and the page-protection proxy can read it at runtime. "All scopes" is fine. Save the variables, then redeploy so the running site picks them up.

Remove `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` if they are still set. This app no longer uses Supabase.

A successful login sets a `session` cookie: HMAC-signed, `HttpOnly`, `SameSite=Lax`, and `Secure` on HTTPS. Netlify serves the site over HTTPS, so the deployed cookie is always `Secure`. Local `next dev` on `http://localhost` leaves `Secure` off so the browser will store the cookie. The session lasts 7 days. Changing `AUTH_SECRET` signs everyone out. Log out from the header, which posts to `/api/auth/logout`.

Failed logins wait one second. After 20 failures from the same client within 10 minutes, further attempts are rejected until that window passes. The counter is kept in memory on each server instance; the delay applies on every instance.

Inventory data still comes from the Shopify Admin API (`SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_ACCESS_TOKEN` in `.env.example`). Those are server-only as well.

## Resources

- Check out the [Next.js on Netlify docs](https://docs.netlify.com/frameworks/next-js/overview/)
