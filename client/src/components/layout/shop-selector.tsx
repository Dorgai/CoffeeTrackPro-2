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
  });

  // Initialize shop selection
  useEffect(() => {
    if (shops.length > 0 && !activeShop) {
      const initialShop = shops[0];
      setActiveShop(initialShop);

      // Initial data fetch
      queryClient.prefetchQuery({ 
        queryKey: ["/api/retail-inventory", initialShop.id] 
      });
      queryClient.prefetchQuery({ 
        queryKey: ["/api/orders", initialShop.id] 
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
            setActiveShop(selectedShop);

            // Invalidate and refetch data for the selected shop
            queryClient.invalidateQueries({
              queryKey: ["/api/retail-inventory", selectedShop.id]
            });
            queryClient.invalidateQueries({
              queryKey: ["/api/orders", selectedShop.id]
            });
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