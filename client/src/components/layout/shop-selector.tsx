import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Shop } from "@shared/schema";
import { useActiveShop } from "@/hooks/use-active-shop";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export function ShopSelector() {
  const { activeShop, setActiveShop } = useActiveShop();
  const { user } = useAuth();
  const [initialized, setInitialized] = useState(false);

  const { data: shops, isLoading, error } = useQuery<Shop[]>({
    queryKey: ["/api/user/shops"],
    staleTime: 30000,
    retry: 3,
    enabled: !!user, // Only run the query if the user is logged in
    onError: (error) => {
      console.error("Error loading shops:", error);
    },
    // Add proper configuration for credentials
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await fetch('/api/user/shops', {
        credentials: 'include' // Important for session cookies
      });
      if (!response.ok) {
        throw new Error('Failed to fetch shops');
      }
      return response.json();
    }
  });

  // Handle initial shop selection with useEffect instead of useState
  useEffect(() => {
    if (shops && shops.length > 0 && !activeShop && !initialized) {
      setActiveShop(shops[0]);
      setInitialized(true);
    }
  }, [shops, activeShop, setActiveShop, initialized]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-[150px]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center text-red-500 text-sm">
        <span>Error loading shops</span>
      </div>
    );
  }

  if (!shops || shops.length === 0) {
    return (
      <div className="flex items-center text-muted-foreground text-sm">
        <span>No shops available</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-between">
          {activeShop ? activeShop.name : "Select shop"}
          <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {shops.map((shop) => (
          <DropdownMenuItem
            key={shop.id}
            onClick={() => setActiveShop(shop)}
            className={
              activeShop?.id === shop.id ? "bg-accent font-medium" : ""
            }
          >
            {shop.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}