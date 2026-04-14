import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin, verifyFirebaseToken } from "../../../server/firebase-admin";
import { getDb } from "../../../server/db";
import { isAdminEmailFromEnv, isPlatformAdmin } from "../../../server/platform-admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split("Bearer ")[1];
  const decoded = await verifyFirebaseToken(token);
  const db = getDb();
  if (!decoded || !(await isPlatformAdmin(db, decoded.email, decoded.uid))) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(500).json({ error: "Firebase Admin not initialized" });
  }
  const { firestore, auth: firebaseAuth } = firebaseAdmin;

  try {
    const emailQuery = (req.query.email as string) || "";
    const [usersSnap, userSubjectsSnap] = await Promise.all([
      firestore.collection("users").get(),
      firestore.collection("user_subjects").get(),
    ]);

    const enrollCountByUser = new Map<string, number>();
    for (const d of userSubjectsSnap.docs) {
      const uid = d.data().userId as string | undefined;
      if (!uid) continue;
      enrollCountByUser.set(uid, (enrollCountByUser.get(uid) || 0) + 1);
    }

    const users: {
      id: string;
      name: string | null;
      email: string;
      state: string | null;
      joinDate: string;
      lastLogin: string | null;
      totalCoursesEnrolled: number;
      status: "active" | "banned";
      isAdmin: boolean;
      hasEnvAdmin: boolean;
      hasDbAdmin: boolean;
    }[] = [];

    const authUids = new Map<string, { lastLogin: string | null }>();
    try {
      const listResult = await firebaseAuth.listUsers(1000);
      listResult.users.forEach((u) => {
        const lastSignIn = u.metadata?.lastSignInTime || null;
        authUids.set(u.uid, { lastLogin: lastSignIn });
      });
    } catch {
      // Auth listUsers may fail without permission; continue with Firestore only
    }

    for (const doc of usersSnap.docs) {
      const data = doc.data();
      const id = doc.id;
      const email = data.email || data.username || "";
      if (emailQuery && !email.toLowerCase().includes(emailQuery.toLowerCase())) {
        continue;
      }
      const createdAt = data.createdAt?.toDate?.() || data.createdAt;
      const joinDate = createdAt ? new Date(createdAt).toISOString() : "";
      const authMeta = authUids.get(id) || authUids.get(data.firebaseUid);
      const lastLogin = authMeta?.lastLogin || null;
      const totalCoursesEnrolled = enrollCountByUser.get(id) || 0;
      const emailStr = email || "(no email)";
      if (emailStr.toLowerCase().endsWith("@firebase.user")) {
        continue;
      }
      const inferred =
        typeof data.inferredState === "string" && data.inferredState.trim() !== ""
          ? data.inferredState.trim()
          : null;
      const hasDbAdmin = data.isAdmin === true;
      const hasEnvAdmin = isAdminEmailFromEnv(emailStr);
      const isBanned = data.banned === true;
      users.push({
        id,
        name: data.displayName || data.username || null,
        email: emailStr,
        state: inferred,
        joinDate,
        lastLogin,
        totalCoursesEnrolled,
        status: isBanned ? "banned" : "active",
        isAdmin: hasEnvAdmin || hasDbAdmin,
        hasEnvAdmin,
        hasDbAdmin,
      });
    }

    return res.status(200).json({ success: true, data: { users } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
