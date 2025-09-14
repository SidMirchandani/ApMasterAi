import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./firebase";
import { getAuthToken } from "./auth-retry";

// Check if Firebase is enabled by checking if auth exists
const isFirebaseEnabled = typeof window !== 'undefined' && !!auth;

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
    console.warn('Firebase not enabled or no current user');
    return {};
  }

  try {
    const now = Date.now();
    const currentUid = auth.currentUser.uid;
    console.log('Getting auth headers for user:', currentUid);

    // Use cached token if it's still valid (with 5 minute buffer)
    if (tokenCache &&
        tokenCache.uid === currentUid &&
        tokenCache.expiry > now + (5 * 60 * 1000)) {
      console.log('Using cached token');
      return {
        'Authorization': `Bearer ${tokenCache.token}`,
        'X-User-ID': currentUid,
        'Content-Type': 'application/json'
      };
    }

    // Get fresh token
    console.log('Getting fresh token...');
    const token = await auth.currentUser.getIdToken();

    // Cache the token (Firebase tokens are valid for 1 hour)
    tokenCache = {
      token,
      uid: currentUid,
      expiry: now + (55 * 60 * 1000) // Cache for 55 minutes
    };

    console.log('Fresh token obtained and cached');
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
  console.log(`Making API request: ${method} ${url}`);

  // Get auth headers asynchronously to ensure fresh tokens
  const authHeaders = await getAuthHeaders();
  console.log('Auth headers keys:', Object.keys(authHeaders));

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

    console.log(`API response status: ${res.status} for ${method} ${url}`);

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`API error response:`, errorText);
      throw new Error(`${res.status}: ${errorText}`);
    }

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
    const url = queryKey.join("/") as string;

    console.log('Query function called for:', url);
    console.log('Auth headers:', Object.keys(authHeaders));

    try {
      const res = await fetch(url, {
        headers: authHeaders,
        credentials: "include",
      });

      console.log(`Query response status for ${url}:`, res.status);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.warn("Unauthorized request, returning null:", queryKey);
        return null;
      }

      await throwIfResNotOk(res);
      const result = await res.json();
      console.log(`Query success for ${url}:`, result);
      return result;
    } catch (error) {
      console.error(`Query failed for ${url}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes - keep data fresh longer
      gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // Refetch when reconnecting to network
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});