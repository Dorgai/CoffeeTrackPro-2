import { useState, useEffect } from "react";
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
    enabled: !!user, // Only run the query if the user is logged in
    staleTime: 30000,
    retry: 3,
    onError: (error) => {
      console.error("Error loading shops:", error);
    },
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

  // Set the first shop as active if there's no active shop yet
  useEffect(() => {
    if (!initialized && shops && shops.length > 0 && !activeShop) {
      setActiveShop(shops[0]);
      setInitialized(true);
    }
  }, [shops, activeShop, initialized, setActiveShop]);

  if (isLoading) {
    return <Skeleton className="h-10 w-[180px]" />;
  }

  if (error || !shops || shops.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[180px] justify-between">
          {activeShop?.name || "Select Shop"}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {shops.map((shop) => (
          <DropdownMenuItem
            key={shop.id}
            onClick={() => setActiveShop(shop)}
            className={activeShop?.id === shop.id ? "bg-accent" : ""}
          >
            {shop.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}