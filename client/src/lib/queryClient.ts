import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      throw new Error(data.message || text);
    } catch {
      throw new Error(text);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: false,
      queryFn: async ({ queryKey }) => {
        const [url] = queryKey as [string, ...unknown[]];
        const res = await fetch(url, {
          credentials: 'include'
        });

        if (!res.ok) {
          const text = await res.text();
          try {
            const error = JSON.parse(text);
            throw new Error(error.message || text);
          } catch {
            throw new Error(text);
          }
        }

        return res.json();
      },
    },
    mutations: {
      retry: false,
    },
  },
});