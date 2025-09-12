import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./firebase";
import { getAuthToken } from "./auth-retry";

// Assume isFirebaseEnabled is defined elsewhere and indicates if Firebase is active
declare const isFirebaseEnabled: boolean;

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Cache for auth tokens to reduce Firebase calls
let tokenCache: { token: string; uid: string; expiry: number } | null = null;

// Get fresh auth headers with caching
export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!isFirebaseEnabled || !auth?.currentUser) {
    return {};
  }

  try {
    const now = Date.now();
    const currentUid = auth.currentUser.uid;

    // Use cached token if it's still valid (with 5 minute buffer)
    if (tokenCache &&
        tokenCache.uid === currentUid &&
        tokenCache.expiry > now + (5 * 60 * 1000)) {
      return {
        'Authorization': `Bearer ${tokenCache.token}`,
        'X-User-ID': currentUid,
        'Content-Type': 'application/json'
      };
    }

    // Get fresh token
    const token = await auth.currentUser.getIdToken();

    // Cache the token (Firebase tokens are valid for 1 hour)
    tokenCache = {
      token,
      uid: currentUid,
      expiry: now + (55 * 60 * 1000) // Cache for 55 minutes
    };

    return {
      'Authorization': `Bearer ${token}`,
      'X-User-ID': currentUid,
      'Content-Type': 'application/json'
    };
  } catch (error) {
    console.error('Failed to get auth token:', error);
    // Clear cache on error
    tokenCache = null;
    return {};
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get auth headers asynchronously to ensure fresh tokens
  const authHeaders = await getAuthHeaders();

  const headers = {
    ...authHeaders,
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API request failed: ${method} ${url}`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get fresh auth headers for queries
    const authHeaders = await getAuthHeaders();

    try {
      const res = await fetch(queryKey.join("/") as string, {
        headers: authHeaders,
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.warn("Unauthorized request, returning null:", queryKey);
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error(`Query failed for ${queryKey.join("/")}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});