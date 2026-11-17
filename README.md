# Personal App — Nexus

Standalone personal career, communications, and market command center, extracted from `xRaudra/damcraft` (`public/personalapp/index.html` and its API routes).

Source revision: `27e833237d7674a9f990a6493cf4b26d0f5e3ebe` (`master`).

The original app features and current design are retained. The Damcraft studio website is not included, and its repository is unchanged.

## Included

- Career dashboard, job search, application tracker, job-description analysis, cover letters, and email drafting.
- Interview practice, company research, salary analysis, profile tools, and learning hub.
- Notes, databases, calendar, news, market information, and existing cloud synchronization.
- Gmail, Slack, and Twilio WhatsApp integration routes; Anthropic AI proxy.

## Local development

Use Node.js 22.19 or later.

```sh
npm ci
cp .env.example .env.local
# Set PERSONAL_APP_PASSWORD in .env.local before opening the app.
npm run dev
```

Open `http://localhost:3000`. The browser asks for HTTP Basic authentication; the username may be any label and the password is `PERSONAL_APP_PASSWORD`. Then create a device PIN on first use. The PIN is a convenience lock; the server password protects the app and its API routes.

## Deploy on Vercel

1. Import this GitHub repository as a new Vercel project.
2. Use the repository root, Next.js framework preset, and the defaults in `vercel.json`.
3. Add `PERSONAL_APP_PASSWORD` as a production environment variable. Without it, the app returns a setup message with HTTP 503 instead of exposing the dashboard.
4. Add the integration variables you use from `.env.example`. No server secrets are committed.
5. Deploy. The app opens at `/`; `/personalapp` redirects to it. Future pushes to `main` can deploy automatically through the GitHub integration.

Existing integrations need their server-side environment variables in the new Vercel project; a GitHub connection alone does not transfer those values. For Gmail, register the new deployment's `/api/auth/gmail/callback` URL in the Google OAuth client and set the same URL as `GMAIL_REDIRECT_URI`. For inbound WhatsApp messages, update Twilio's webhook URL to the new deployment's `/api/whatsapp/incoming` endpoint.

## Data continuity

The existing Firebase project configuration is retained so the app can use the same cloud-synchronized notes, tracker, and preferences. No cloud data was accessed or changed during extraction. Browser-only data is tied to the old site's origin and does not automatically move to a different domain. The device PIN is no longer synchronized to Firestore, and there is no built-in default PIN.

Do not run “clear cloud data” while comparing the two deployments: both refer to the same existing cloud store.

## Validation

```sh
npm run build
npm run typecheck
npm run test:smoke
```

The smoke test starts the production server with temporary test credentials. It removes integration environment variables so no real email, messages, AI requests, or cloud writes occur.

## Structure

- `public/personalapp/index.html`: original standalone app shell and browser interactions.
- `src/app/route.ts`: serves the app at the new site's root.
- `src/app/api/`: the app's server integrations.
- `src/lib/`: Gmail parsing/sanitization and Twilio signature verification.
- `src/proxy.ts`: protects the entire app and APIs. The Twilio incoming webhook uses its own signature check.
- `.env.example`: names of supported server configuration values, with no credentials.
