import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shop } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Store, Loader2 } from "lucide-react";
import { useActiveShop } from "@/hooks/use-active-shop";
import { queryClient } from "@/lib/queryClient";

export function ShopSelector() {
  const { activeShop, setActiveShop } = useActiveShop();
  const { data: shops = [], isLoading } = useQuery<Shop[]>({
    queryKey: ["/api/user/shops"],
    refetchOnMount: "always",
    staleTime: 0,
    refetchInterval: 5000, // Refresh shop list every 5 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });

  // Initialize shop selection
  useEffect(() => {
    if (shops.length > 0 && !activeShop) {
      const initialShop = shops[0];
      setActiveShop(initialShop);

      // Prefetch initial data immediately
      queryClient.prefetchQuery({ 
        queryKey: ["/api/retail-inventory", initialShop.id],
        staleTime: 0,
        refetchInterval: 5000,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true
      });
      queryClient.prefetchQuery({ 
        queryKey: ["/api/orders", initialShop.id],
        staleTime: 0,
        refetchInterval: 5000,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true
      });
    }
  }, [shops, activeShop, setActiveShop]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Store className="h-4 w-4" />
        <div className="flex items-center gap-2 min-w-[200px] h-9 px-3 rounded-md border">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading shops...</span>
        </div>
      </div>
    );
  }

  if (!shops.length) {
    return (
      <div className="flex items-center gap-2">
        <Store className="h-4 w-4" />
        <div className="flex items-center gap-2 min-w-[200px] h-9 px-3 rounded-md border">
          <span className="text-sm text-muted-foreground">No shops available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Store className="h-4 w-4" />
      <Select
        value={activeShop?.id?.toString() || shops[0]?.id?.toString()}
        onValueChange={(value) => {
          const selectedShop = shops.find((s) => s.id === parseInt(value));
          if (selectedShop) {
            // This will trigger the refreshShopData internally
            setActiveShop(selectedShop);
          }
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue>
            {activeShop?.name || shops[0]?.name || "Select a shop"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {shops.map((shop) => (
            <SelectItem key={shop.id} value={shop.id.toString()}>
              {shop.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}