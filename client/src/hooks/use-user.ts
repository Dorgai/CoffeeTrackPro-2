
import { useQuery } from "@tanstack/react-query";

export function useUser() {
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["/api/auth/me"],
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });

  return { user, isLoading, refetch };
}
