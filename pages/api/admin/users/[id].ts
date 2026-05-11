import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin } from "../../../../server/firebase-admin";
import { getDb } from "../../../../server/db";
import { isAdminEmailFromEnv } from "../../../../server/platform-admin";
import { requireAdmin } from "../../../../server/next-api-auth";
import { mergeAdminUserListIntoFirestorePatch } from "../../../../server/admin-user-list";
import { buildUserSearchFields } from "../../../../server/user-search-fields";

function getRouteId(req: NextApiRequest): string {
  return typeof req.query.id === "string" ? req.query.id : Array.isArray(req.query.id) ? req.query.id[0] : "";
}

function normalizeState(raw: unknown): { ok: true; value: string | null } | { ok: false; error: string } {
  if (typeof raw === "string") {
    const trimmed = raw.trim().toUpperCase();
    if (trimmed === "") return { ok: true, value: null };
    if (!/^[A-Z]{2}$/.test(trimmed)) {
      return { ok: false, error: "inferredState must be a 2-letter US state code or empty" };
    }
    return { ok: true, value: trimmed };
  }
  if (raw == null) return { ok: true, value: null };
  return { ok: false, error: "inferredState must be a string or null" };
}

function isGarbledLastName(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 4 && /^[^A-Za-z0-9]+$/.test(trimmed);
}

async function deleteMatchingCollectionDocs(db: FirebaseFirestore.Firestore, collection: string, userIds: string[]) {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  for (const userId of unique) {
    const snap = await db.collection(collection).where("userId", "==", userId).get();
    for (const doc of snap.docs) {
      await db.recursiveDelete(doc.ref);
    }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = getRouteId(req);
  if (!id) {
    return res.status(400).json({ error: "Missing user id" });
  }

  const db = getDb();
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (!admin.isEnvAdmin) {
    return res.status(403).json({ error: "Only ADMIN_EMAILS admins can mutate users." });
  }

  const userRef = db.collection("users").doc(id);
  const targetSnap = await userRef.get();
  if (!targetSnap.exists) {
    return res.status(404).json({ error: "User not found" });
  }

  const targetData = targetSnap.data()!;
  const targetEmail = (targetData.email || targetData.username || "") as string;
  const authUid = ((targetData.firebaseUid as string) || id) as string;
  const firebaseAdmin = getFirebaseAdmin();

  if (req.method === "DELETE") {
    if (authUid === admin.uid || id === admin.uid) {
      return res.status(403).json({ error: "You cannot delete your own account." });
    }
    if (isAdminEmailFromEnv(targetEmail)) {
      return res.status(403).json({ error: "You cannot delete an ADMIN_EMAILS account." });
    }
    if (!firebaseAdmin) {
      return res.status(500).json({ error: "Firebase Admin not initialized" });
    }

    const userIds = Array.from(new Set([id, authUid].filter(Boolean)));
    await Promise.all([
      ...userIds.map((uid) => db.collection("user_stats").doc(uid).delete().catch(() => undefined)),
      deleteMatchingCollectionDocs(db, "user_subjects", userIds),
      deleteMatchingCollectionDocs(db, "user_question_state", userIds),
    ]);
    await db.recursiveDelete(userRef);
    try {
      await firebaseAdmin.auth.deleteUser(authUid);
    } catch (e: unknown) {
      const code = e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
      if (code !== "auth/user-not-found") {
        const msg = e instanceof Error ? e.message : "Auth delete failed";
        return res.status(500).json({ error: msg });
      }
    }

    return res.status(200).json({ success: true, data: { id, deleted: true } });
  }

  const body = req.body || {};
  const wantAdmin = body.isAdmin;
  const wantBanned = body.banned;
  const hasInferredStateUpdate = Object.prototype.hasOwnProperty.call(body, "inferredState");
  const profileAction = typeof body.profileAction === "string" ? body.profileAction : "";

  let normalizedInferredState: string | null = null;
  if (hasInferredStateUpdate) {
    const parsedState = normalizeState(body.inferredState);
    if ("error" in parsedState) return res.status(400).json({ error: parsedState.error });
    normalizedInferredState = parsedState.value;
  }

  const hasProfileAction = profileAction === "clear_garbled_last_name";
  if (
    typeof wantAdmin !== "boolean" &&
    typeof wantBanned !== "boolean" &&
    !hasInferredStateUpdate &&
    !hasProfileAction
  ) {
    return res.status(400).json({
      error: "Body must include isAdmin, banned, inferredState, or profileAction",
    });
  }

  if (typeof wantAdmin === "boolean" && wantAdmin === false && id === admin.uid && !isAdminEmailFromEnv(admin.email)) {
    return res.status(403).json({
      error: "You cannot remove your own Firestore admin flag without being on ADMIN_EMAILS.",
    });
  }

  if (wantBanned === true && authUid === admin.uid) {
    return res.status(403).json({ error: "You cannot ban your own account." });
  }

  const patch: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (typeof wantAdmin === "boolean") patch.isAdmin = wantAdmin;
  if (typeof wantBanned === "boolean") patch.banned = wantBanned;
  if (hasInferredStateUpdate) {
    patch.inferredState = normalizedInferredState;
    patch.inferredStateAt = new Date().toISOString();
    patch.inferenceSource = normalizedInferredState ? "admin" : null;
  }
  if (hasProfileAction && isGarbledLastName(targetData.lastName)) {
    patch.lastName = "";
  }

  const resolvedState =
    hasInferredStateUpdate
      ? normalizedInferredState
      : typeof targetData.inferredState === "string"
        ? targetData.inferredState
        : null;
  const resolvedLastName =
    Object.prototype.hasOwnProperty.call(patch, "lastName")
      ? String(patch.lastName || "")
      : typeof targetData.lastName === "string"
        ? targetData.lastName
        : null;

  Object.assign(
    patch,
    buildUserSearchFields({
      displayName:
        typeof targetData.displayName === "string"
          ? targetData.displayName
          : typeof targetData.username === "string"
            ? targetData.username
            : null,
      username: typeof targetData.username === "string" ? targetData.username : null,
      email: typeof targetData.email === "string" ? targetData.email : targetEmail,
      inferredState: resolvedState,
    }),
  );

  mergeAdminUserListIntoFirestorePatch(patch, {
    email: typeof targetData.email === "string" ? targetData.email : targetEmail,
    username:
      typeof targetData.username === "string"
        ? targetData.username
        : typeof targetData.displayName === "string"
          ? targetData.displayName
          : null,
    displayName:
      typeof targetData.displayName === "string"
        ? targetData.displayName
        : typeof targetData.username === "string"
          ? targetData.username
          : null,
  });

  if (typeof wantBanned === "boolean") {
    if (!firebaseAdmin) {
      return res.status(500).json({ error: "Firebase Admin not initialized" });
    }
    try {
      await firebaseAdmin.auth.updateUser(authUid, { disabled: wantBanned });
    } catch (e: unknown) {
      const code = e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
      if (code !== "auth/user-not-found") {
        const msg = e instanceof Error ? e.message : "Auth update failed";
        return res.status(500).json({ error: msg });
      }
    }
  }

  await userRef.update(patch);

  const refreshed = (await userRef.get()).data()!;
  const hasDbAdmin = refreshed.isAdmin === true;
  const hasEnv = isAdminEmailFromEnv(targetEmail);
  const isBanned = refreshed.banned === true;

  return res.status(200).json({
    success: true,
    data: {
      id,
      isAdmin: hasEnv || hasDbAdmin,
      hasEnvAdmin: hasEnv,
      hasDbAdmin,
      status: isBanned ? "banned" : "active",
      state: typeof refreshed.inferredState === "string" ? refreshed.inferredState : null,
      lastName: typeof resolvedLastName === "string" ? resolvedLastName : null,
    },
  });
}
