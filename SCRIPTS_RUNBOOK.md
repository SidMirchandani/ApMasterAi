## Scripts Runbook

This document describes how to run APMaster maintenance and backfill scripts safely.

### Conventions

- **Environment selection**:
  - Scripts are Node programs under `scripts/` or `server/` that expect a `.env` with Firebase and app config.
  - Never point development scripts at production credentials without reviewing the script first.
- **Dry runs**:
  - When available, prefer `--dry-run` or `DRY_RUN=1` to validate effects before writing.
  - If a script does not support a dry run, read its source to confirm which collections and fields it mutates.

### Common scripts

- `scripts/seed-demo-user-regions.ts`
  - **Purpose**: Backfills approximate state/region metadata for demo or test users.
  - **Env**: Development or staging only.
  - **Notes**: Reads from `users` and writes derived geo fields; safe to re-run.

- `scripts/backfill-inferred-state-retry.ts`
  - **Purpose**: Retries geo-IP inference for users with missing or failed state lookups.
  - **Env**: Staging or production with caution.
  - **Notes**: Uses `user-geo-state` helpers to avoid overriding explicit user state.

- `server/nj-backfill-migration.ts`
  - **Purpose**: One-off migration used for a New Jersey backfill; kept for historical reference.
  - **Env**: Do not re-run without code review.
  - **Notes**: Treat as an example of how to structure future migrations.

### Operational guidelines

- Before running any script:
  - Verify which collections it reads and writes.
  - Confirm the Firebase project and database URL via environment variables.
  - Prefer running against a recent backup or staging copy first.
- After running:
  - Spot-check a few affected documents in Firestore (different users/subjects).
  - Review logs for unexpected errors or large write counts.

