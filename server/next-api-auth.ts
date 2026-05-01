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

const AUTH_CACHE_TTL_MS = 30_000;
const authSuccessCache = new Map<string, { expiresAt: number; user: AuthenticatedUser }>();
const adminSuccessCache = new Map<string, { expiresAt: number; admin: AdminContext }>();

async function getBearerToken(req: NextApiRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length);
}

function cacheHit<T>(cache: Map<string, { expiresAt: number; [k: string]: unknown }>, key: string): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return (hit.user ?? hit.admin) as T;
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

  const cached = cacheHit<AuthenticatedUser>(authSuccessCache as Map<string, { expiresAt: number; [k: string]: unknown }>, token);
  if (cached) {
    return cached;
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

  const user = {
    uid: decoded.uid,
    email: decoded.email,
    decodedToken: decoded,
  };
  authSuccessCache.set(token, { expiresAt: Date.now() + AUTH_CACHE_TTL_MS, user });
  return user;
}

export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
  options?: { bannedVariant?: BannedResponseVariant },
): Promise<AdminContext | null> {
  const token = await getBearerToken(req);
  if (!token) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }
  const adminCached = cacheHit<AdminContext>(adminSuccessCache as Map<string, { expiresAt: number; [k: string]: unknown }>, token);
  if (adminCached) return adminCached;

  const user = await requireUser(req, res, options);
  if (!user) return null;

  const db = getDb();
  const isPlatform = await isPlatformAdmin(db, user.email, user.uid);
  if (!isPlatform) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }

  const admin = {
    ...user,
    isEnvAdmin: isEnvAdminEmail(user.email),
  };
  adminSuccessCache.set(token, { expiresAt: Date.now() + AUTH_CACHE_TTL_MS, admin });
  return admin;
}

