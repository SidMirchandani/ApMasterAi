import type { NextApiRequest, NextApiResponse } from "next";
import { verifyFirebaseToken } from "./firebase-admin";
import { assertNotBanned, type BannedResponseVariant } from "./api-user-auth";
import { getDb } from "./db";
import { isEnvAdminEmail, isPlatformAdmin } from "./platform-admin";

export interface AuthenticatedUser {
  uid: string;
  email?: string | null;
  decodedToken: any;
}

export interface AdminContext extends AuthenticatedUser {
  isEnvAdmin: boolean;
}

async function getBearerToken(req: NextApiRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length);
}

export async function requireUser(
  req: NextApiRequest,
  res: NextApiResponse,
  options?: { bannedVariant?: BannedResponseVariant },
): Promise<AuthenticatedUser | null> {
  const token = await getBearerToken(req);
  if (!token) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }

  let decoded: any;
  try {
    decoded = await verifyFirebaseToken(token);
  } catch {
    res.status(401).json({ success: false, message: "Invalid token" });
    return null;
  }

  const bannedOk = await assertNotBanned(
    res,
    decoded.uid,
    options?.bannedVariant ?? "default",
  );
  if (!bannedOk) return null;

  return {
    uid: decoded.uid,
    email: decoded.email,
    decodedToken: decoded,
  };
}

export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
  options?: { bannedVariant?: BannedResponseVariant },
): Promise<AdminContext | null> {
  const user = await requireUser(req, res, options);
  if (!user) return null;

  const db = getDb();
  const isPlatform = await isPlatformAdmin(db, user.email, user.uid);
  if (!isPlatform) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }

  return {
    ...user,
    isEnvAdmin: isEnvAdminEmail(user.email),
  };
}

