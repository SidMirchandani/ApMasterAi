# Admin User Management Phase A succinct plan

Firestore only. No Algolia / Typesense / Meilisearch in this plan.

---

## Two separate problems

| Problem | What happens today | What we do |
|--------|--------------------|------------|
| **A. `@firebase.user` noise** | Rows are read, then skipped. Paging does extra batches. | Store **`showInAdminUserList`** and query **`where == true`** so those docs are **never read** for admin listing. |
| **B. “Search” scans** | Blob `includes()` walks the collection in chunks. | **One active column filter**, each mapped to an **indexed** Firestore query (equality / range / prefix). |

Neither replaces the other. **Do Block 1 first**, then Block 2.

---

## Block 1 Must ship anonymous hidden plus fast paging

Actions:

1. **Field:** `users.showInAdminUserList` — `false` for firebase pseudonym identities (same **`...@firebase.user`** rule you already use), `true` for everyone else.
2. **Backfill** existing `users` in one scripted pass.
3. **Writes:** Every route that creates/updates profile email/username calls one **`deriveShowInAdminUserList(...)`** and persists the flag.
4. **Index:** Composite `showInAdminUserList` ASC · `createdAt` DESC · `__name__` DESC (tie-break for stable cursors).
5. **`GET /api/admin/users`** with **no column filter:** one **`query.get()`** (plus cursor), **no outer `while` loop**. Still call **`getUserStatsBatch`** for the page.

**Result:** Bounded reads per page; anonymous firebase accounts **gone from this screen** without being loaded.

---

## Block 2 Column filters one at a time

Actions:

1. **UI (`AdminUsersTab`):** Tiny filter row aligned to columns — **mutex:** only **one** non-empty filter refetches (**clear others when one is used**).
2. **Prefixes:** Maintain **`adminEmailLower`** / **`adminDisplayNameLower`** on `users`; backfill once. Queries use **`>= prefix` and `<= prefix + '\uf8ff'`** (starts-with semantics).
3. **Other columns:** Mapped to native filters where possible (`inferredState`, `banned`, `createdAt` range for joined, **`isAdmin`** for DB admin only).
4. **API:** Drop single `q`; accept exactly **one** filter family per request (**400** if multiple). Separate query + cursor semantics per branch; add composites Firestore prompts for.
5. **Courses enrolled:** Filtering needs a **denormalized count on `users`** wired from **`user_stats`**, **or** no server filter until that exists.
6. **Copy:** Env-only admins are **not** `isAdmin` on the doc unless you duplicate that → label the admin filter honestly.

Prefix = **starts-with**, not “contains anywhere.”
