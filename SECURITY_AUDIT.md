# Security Audit: Credentials & Deployment (Edison Public Schools)

**Scope:** Credential handling, authentication, and deployment safety for K-12 use.  
**Date:** 2026.

---

## Executive summary

- **Secrets and env:** `.env` / `.env.local` are gitignored; no secrets found in repo. Firebase and Gemini keys are correctly read from environment variables.
- **Critical:** Admin access and logging need hardening. Express backend (when used) does not verify Firebase tokens—only trusts `x-user-id` header.
- **Recommendation:** Use server-side env only for admin list; remove or restrict sensitive logging; ensure production either uses Next.js API routes only (e.g. Vercel) or add token verification to Express.

---

## 1. Environment and secrets

| Item | Status | Notes |
|------|--------|--------|
| `.env`, `.env.local` | OK | In `.gitignore`; not committed. |
| Firebase client config | OK | `NEXT_PUBLIC_*` only for non-secret config (project ID, API key for client). |
| Firebase Service Account | OK | `FIREBASE_SERVICE_ACCOUNT_KEY` (server-only); used in `server/firebase-admin.ts`. |
| Gemini API key | OK | `AI_INTEGRATIONS_GEMINI_API_KEY` (server-only) in server and API routes. |
| `.env.example` | OK | Documents required vars without real values. |

**Recommendation for Edison:** Keep `FIREBASE_SERVICE_ACCOUNT_KEY` and `AI_INTEGRATIONS_GEMINI_API_KEY` only in server environment (e.g. Vercel env vars, not `NEXT_PUBLIC_*`). Do not add them to `.env.example` with real values.

---

## 2. Authentication

### 2.1 Firebase

- **Client:** Firebase Auth (Google sign-in, etc.); ID tokens obtained via `getIdToken()`.
- **Next.js API routes:** Correctly verify Bearer token with `verifyFirebaseToken()` and use `decodedToken.uid` (never trust client-supplied user id from headers/body for auth).
- **Token handling:** Tokens sent as `Authorization: Bearer <token>`; cached client-side with expiry; not logged.

### 2.2 Express backend (`server/routes.ts`)

- **Fixed:** Protected routes now use middleware `requireFirebaseAuth`, which verifies the `Authorization: Bearer` token via `verifyFirebaseToken()` and sets `res.locals.firebaseUid`. Routes use this verified UID instead of trusting the `x-user-id` header. User lookup uses `storage.getUserByFirebaseUid` / `storage.createUser` (server-only).
- **Recommendation:** When running the Express server (e.g. Replit or a combined server), ensure `FIREBASE_SERVICE_ACCOUNT_KEY` (or default credentials) is set so token verification succeeds.

### 2.3 Admin access

- **Issue 1:** Many admin API routes allow **either** `ADMIN_EMAILS` or `NEXT_PUBLIC_ADMIN_EMAILS`. Any `NEXT_PUBLIC_*` value is bundled into the client and is visible to anyone. Using `NEXT_PUBLIC_ADMIN_EMAILS` for access control exposes the list of admin emails.
- **Issue 2:** Admin UI uses `NEXT_PUBLIC_ADMIN_HINT` for “who can access” (comma-separated emails). Same exposure: admin emails end up in the client bundle.
- **Files:** `pages/api/admin/add-subject.ts`, `subject-status.ts`, `recategorize-physics.ts`, `questions/bulk.ts`, `delete-subject.ts`, `migrate-images.ts`, `fix-unit-assignment.ts`, `auto-scrape.ts`; `pages/admin/index.tsx`.

**Recommendation:**

- Use **only** server-side `ADMIN_EMAILS` (no `NEXT_PUBLIC_ADMIN_EMAILS` or `NEXT_PUBLIC_ADMIN_HINT`) for determining admin access in API routes and for any “hint” text that includes emails. Remove fallbacks to `NEXT_PUBLIC_*` for admin checks.
- For the admin UI, use a generic message (e.g. “Contact your administrator”) instead of embedding allowed emails in the client.

---

## 3. Sensitive data in logs

- **Issue:** Some routes log data that is sensitive in a school context or that could aid an attacker:
  - `server/routes.ts`: logs Firebase UID on every request (`GET /api/user/subjects - Firebase UID: …`).
  - `pages/api/admin/questions/bulk.ts`: logs `Raw ADMIN_EMAILS value`, `Allowed emails`, `Decoded user email`, and `ADMIN_EMAILS env`.
  - `pages/api/admin/questions/query.ts`: logs `Token decoded email`.
  - Client: `api.ts` / `queryClient.ts` log “Getting auth headers for user: &lt;uid&gt;” and “Using cached token” (less critical but still identifiable).

**Recommendation:**

- In production, do **not** log:
  - Firebase UIDs, emails, or any admin list.
  - Raw env values (e.g. `ADMIN_EMAILS`).
- Keep logs to: method, path, status, and optionally a non-identifying request id. Remove or guard with `NODE_ENV !== 'production'` the logs listed above.

---

## 4. Placeholder password in storage (`server/routes.ts`)

- **Current:** `storage.createUser({ username: firebaseUid, password: 'firebase_auth' })` (and similar in other storage layers). Login is via Firebase only; this password is never used for authentication.
- **Risk:** If the user table were ever used for password-based login elsewhere, this would be weak. As long as auth is Firebase-only, this is a known placeholder.
- **Recommendation:** Add a short comment in code that this value is a placeholder and must not be used for authentication. Optionally use a random per-user placeholder stored only in DB (no need to verify it).

---

## 5. HTTPS and cookies

- Tokens are sent in the `Authorization` header (not cookies). No `HttpOnly`/cookie config to audit.
- Ensure production is **HTTPS only** (e.g. Vercel default; if self-hosting, put the app behind TLS and redirect HTTP → HTTPS). This protects tokens in transit.

---

## 6. School-specific (Edison Public Schools)

- **Google sign-in:** Restrict to Edison domains (e.g. `@edison.k12.nj.us` or your allowed list) in Firebase Console → Authentication → Sign-in method → Google → restrict to authorized domains / allowlist. This prevents personal Gmail accounts if you want only school accounts.
- **FERPA/COPPA:** User data (email, UID, progress) is stored in your backend/Firestore. Ensure privacy policy and data handling align with district policy; limit collection to what’s needed; secure Firestore (rules + service account) and env vars.
- **Admin list:** Populate `ADMIN_EMAILS` with only trusted staff (e.g. Edison emails); keep it in server env only and do not expose via `NEXT_PUBLIC_*` or logs.

---

## 7. Checklist for deployment (Edison)

- [x] Express: Firebase token verification added; routes use `res.locals.firebaseUid` from verified token (done). If you use only Next.js (e.g. Vercel), no change needed.
- [x] Set `ADMIN_EMAILS` in server environment only; removed `NEXT_PUBLIC_ADMIN_EMAILS` and `NEXT_PUBLIC_ADMIN_HINT` from admin logic; admin UI derives access from API response (subject-status).
- [x] Removed or reduced logging of UIDs, emails, and admin env in server routes and admin bulk/query APIs.
- [ ] Ensure `FIREBASE_SERVICE_ACCOUNT_KEY` and `AI_INTEGRATIONS_GEMINI_API_KEY` exist only in server env and are not in client bundle or `.env.example`.
- [ ] Enforce HTTPS; restrict Google sign-in to school domains if required by policy.
