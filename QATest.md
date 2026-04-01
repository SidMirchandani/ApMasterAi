### APMaster regression test checklist

#### 1. Install dependencies (once per environment)

```bash
cd ApMasterAi
npm install
```

#### 2. Typecheck & lint

```bash
cd ApMasterAi
npm run lint
npm run typecheck
```

#### 3. Run server-side unit tests

```bash
cd ApMasterAi
# Run all tests (if configured)
npm test

# Or run just the new diagnostic config tests
node --test server/diagnostic-config.test.ts
```

#### 4. Build both apps

```bash
cd ApMasterAi
npm run build
```

#### 5. Manual smoke tests (via browser, after `npm run dev`)

- **Subjects dashboard**
  - Sign in with a test user.
  - Hit the dashboard and verify subjects load from `/api/user/subjects`.
  - Add a subject; confirm it appears and no console/network errors.
- **Full-length quiz**
  - Start a full-length quiz for any subject.
  - Answer a few questions, submit, and confirm:
    - Results page loads.
    - Analytics charts update without error.
- **Practice quiz**
  - Start a unit practice quiz.
  - Answer/flag a few questions, use “Save & Exit” if available, then resume.
- **Bookmarks & review**
  - Bookmark a question in a quiz.
  - Visit the Bookmarks page; confirm the question appears and un-bookmark works.
- **Spaced repetition**
  - Get some questions wrong in practice.
  - Call `/api/user/questions/due` (via app’s review flow) and confirm due questions appear.
- **Admin/diagnostic**
  - Run a diagnostic test, finish it, and verify:
    - Diagnostic results page loads.
    - Analytics `/api/user/analytics` returns predicted score without error.

