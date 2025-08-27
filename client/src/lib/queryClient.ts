import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./firebase";
import { getAuthToken } from "./auth-retry";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  
  if (auth?.currentUser) {
    try {
      // Use the enhanced token getter with retry logic
      const idToken = await getAuthToken();
      if (idToken) {
        headers["x-user-id"] = auth.currentUser.uid;
        headers["authorization"] = `Bearer ${idToken}`;
        console.log("Adding auth headers for user:", auth.currentUser.uid);
      } else {
        // Fallback to just the UID if token is unavailable
        headers["x-user-id"] = auth.currentUser.uid;
        console.log("Adding auth header (UID only) for user:", auth.currentUser.uid);
      }
    } catch (error) {
      console.error("Failed to get auth token:", error);
      // Fallback to just the UID if token generation fails
      if (auth.currentUser.uid) {
        headers["x-user-id"] = auth.currentUser.uid;
        console.log("Adding fallback auth header for user:", auth.currentUser.uid);
      }
    }
  } else {
    console.log("No auth user available for headers:", { 
      auth: !!auth, 
      currentUser: !!auth?.currentUser 
    });
  }
  
  return headers;
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
