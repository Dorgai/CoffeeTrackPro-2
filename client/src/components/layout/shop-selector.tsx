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
import { useToast } from "@/hooks/use-toast";

export function ShopSelector() {
  const { activeShop, setActiveShop } = useActiveShop();
  const { toast } = useToast();

  const { data: shops, isLoading, error } = useQuery<Shop[]>({
    queryKey: ["/api/user/shops"],
    retry: 2,
    onError: (error: Error) => {
      toast({
        title: "Error loading shops",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (shops?.length && !activeShop) {
      setActiveShop(shops[0]);
      queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory", shops[0].id] });
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

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <Store className="h-4 w-4" />
        <div className="flex items-center gap-2 min-w-[200px] h-9 px-3 rounded-md border border-destructive">
          <span className="text-sm text-destructive">Error loading shops</span>
        </div>
      </div>
    );
  }

  if (!shops?.length) {
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
          const shop = shops.find((s) => s.id === parseInt(value));
          if (shop) {
            setActiveShop(shop);
            queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory", shop.id] });
          }
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue>
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