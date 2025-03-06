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
import { apiRequest } from "@/lib/queryClient";
import React from 'react';

export function ShopSelector() {
  const { activeShop, setActiveShop } = useActiveShop();
  const { data: shops = [], isLoading } = useQuery<Shop[]>({
    queryKey: ["/api/user/shops"],
    queryFn: async () => {
      console.log("Fetching shops in ShopSelector");
      const res = await apiRequest("GET", "/api/user/shops");
      if (!res.ok) {
        throw new Error("Failed to fetch shops");
      }
      const data = await res.json();
      console.log("Received shops data:", data);
      return data;
    },
    refetchOnMount: "always",
    staleTime: 0,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: 1000,
  });

  // Initialize shop selection if not already set
  React.useEffect(() => {
    console.log("Shop selection effect running", { shops, activeShop });
    if (shops.length > 0 && !activeShop) {
      console.log("Setting initial active shop:", shops[0]);
      setActiveShop(shops[0]);
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

  console.log("Rendering ShopSelector with shops:", shops);

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
        onValueChange={(value) => {
          console.log("Shop selection changed to:", value);
          const selectedShop = shops.find((s) => s.id === parseInt(value));
          if (selectedShop) {
            console.log("Setting active shop to:", selectedShop);
            setActiveShop(selectedShop);
          }
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select a shop">
            {activeShop?.name || "Select a shop"}
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