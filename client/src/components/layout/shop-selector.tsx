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
  });

  // Handle initial shop selection
  useEffect(() => {
    if (!activeShop && shops.length > 0) {
      const initialShop = shops[0];
      setActiveShop(initialShop);
      // Prefetch data for initial shop
      queryClient.prefetchQuery({ 
        queryKey: ["/api/retail-inventory", initialShop.id] 
      });
      queryClient.prefetchQuery({ 
        queryKey: ["/api/orders", initialShop.id] 
      });
    }
  }, [shops, activeShop, setActiveShop]);

  const handleShopChange = (shopId: string) => {
    const selectedShop = shops.find((s) => s.id === parseInt(shopId));
    if (selectedShop) {
      setActiveShop(selectedShop);
      // Invalidate and prefetch all shop-dependent queries
      queryClient.invalidateQueries({ 
        queryKey: ["/api/retail-inventory", selectedShop.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/orders", selectedShop.id] 
      });
      // Prefetch the data
      queryClient.prefetchQuery({ 
        queryKey: ["/api/retail-inventory", selectedShop.id] 
      });
      queryClient.prefetchQuery({ 
        queryKey: ["/api/orders", selectedShop.id] 
      });
    }
  };

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
        value={activeShop?.id?.toString()}
        onValueChange={handleShopChange}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select a shop">
            {activeShop?.name}
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