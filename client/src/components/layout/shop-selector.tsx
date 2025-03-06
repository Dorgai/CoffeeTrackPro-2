import { useQuery } from "@tanstack/react-query";
import { useEffect } from 'react';
import { Shop } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Store, Loader2, AlertCircle } from "lucide-react";
import { useActiveShop } from "@/hooks/use-active-shop";
import { apiRequest } from "@/lib/queryClient";

export function ShopSelector() {
  const { activeShop, setActiveShop } = useActiveShop();

  const { data: shops = [], isLoading, error } = useQuery<Shop[]>({
    queryKey: ["/api/user/shops"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/shops");
      if (!res.ok) {
        throw new Error("Failed to fetch shops");
      }
      const data = await res.json();
      return data;
    }
  });

  // Set initial shop if none selected
  useEffect(() => {
    if (shops.length > 0 && !activeShop) {
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

  return (
    <div className="flex items-center gap-2">
      <Store className="h-4 w-4" />
      <Select
        value={activeShop?.id?.toString()}
        onValueChange={(value) => {
          const selectedShop = shops.find((s) => s.id === parseInt(value));
          if (selectedShop) {
            setActiveShop(selectedShop);
          }
        }}
      >
        <SelectTrigger className={`w-[200px] ${error ? 'border-destructive' : ''}`}>
          <SelectValue>
            {error ? (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>Error loading shops</span>
              </div>
            ) : (
              activeShop?.name || "Select a shop"
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {!error && shops.map((shop) => (
            <SelectItem key={shop.id} value={shop.id.toString()}>
              {shop.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}