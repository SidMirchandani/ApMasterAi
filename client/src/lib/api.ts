
import { auth } from "./firebase";
import { getAuthToken } from "./auth-retry";

const isFirebaseEnabled = typeof window !== 'undefined' && !!auth;

let tokenCache: { token: string; uid: string; expiry: number } | null = null;

export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!isFirebaseEnabled || !auth?.currentUser) {
    return {};
  }

  try {
    const currentUser = auth.currentUser;
    const uid = currentUser.uid;
    const now = Date.now();

    if (tokenCache && tokenCache.uid === uid && tokenCache.expiry > now + 5 * 60 * 1000) {
      console.log("Using cached token");
      return {
        "Authorization": `Bearer ${tokenCache.token}`,
        "X-User-UID": uid,
      };
    }

    console.log("Getting auth headers for user:", uid);
    const token = await getAuthToken(false);

    if (!token) {
      return {};
    }

    tokenCache = {
      token,
      uid,
      expiry: now + 55 * 60 * 1000,
    };

    return {
      "Authorization": `Bearer ${token}`,
      "X-User-UID": uid,
    };
  } catch (error) {
    console.error("Error getting auth headers:", error);
    return {};
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  body?: unknown
): Promise<Response> {
  console.log("Making API request:", method, url);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const authHeaders = await getAuthHeaders();
  Object.assign(headers, authHeaders);

  const options: RequestInit = {
    method,
    headers,
    credentials: "include",
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);

  console.log(`API response status: ${res.status} for ${method} ${url}`);

  await throwIfResNotOk(res);
  return res;
}
