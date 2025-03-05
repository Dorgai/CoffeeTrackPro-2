
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

  // Handle initial shop selection with useEffect
  useEffect(() => {
    if (shops && shops.length > 0 && !activeShop && !initialized) {
      setActiveShop(shops[0]);
      setInitialized(true);
    }
  }, [shops, activeShop, setActiveShop, initialized]);

  if (isLoading) {
    return (
      <Button variant="outline" className="w-[200px]" disabled>
        <Skeleton className="h-4 w-[160px]" />
      </Button>
    );
  }

  if (error) {
    return (
      <Button variant="outline" className="w-[200px] text-red-500" disabled>
        Error loading shops
      </Button>
    );
  }

  if (!shops || shops.length === 0) {
    return (
      <Button variant="outline" className="w-[200px]" disabled>
        No shops available
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-between">
          {activeShop ? activeShop.name : "Select Shop"}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
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
