import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shop } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveShop } from "@/hooks/use-active-shop";
import { Store, Loader2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface ShopSelectorProps {
  value?: number | null;
  onChange?: (shopId: number | null) => void;
}

export function ShopSelector({ value, onChange }: ShopSelectorProps) {
  const { activeShop, setActiveShop } = useActiveShop();

  // Fetch user's authorized shops
  const { data: shops, isLoading } = useQuery<Shop[]>({
    queryKey: ["/api/user/shops"],
  });

  useEffect(() => {
    // Only set default shop if we have shops and no active shop
    if (shops && shops.length > 0 && !activeShop) {
      const defaultShop = shops[0];
      setActiveShop(defaultShop);
      onChange?.(defaultShop.id);

      // Initial data load for the default shop
      queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory", defaultShop.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", defaultShop.id] });
    }
  }, [shops, activeShop, setActiveShop, onChange]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Store className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-2 min-w-[200px] h-9 px-3 rounded-md border">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading shops...</span>
        </div>
      </div>
    );
  }

  if (!shops || shops.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Store className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-2 min-w-[200px] h-9 px-3 rounded-md border">
          <span className="text-sm text-muted-foreground">No shops available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Store className="h-4 w-4 text-muted-foreground" />
      <Select
        value={value?.toString() || activeShop?.id?.toString() || ""}
        onValueChange={(val) => {
          const shopId = Number(val);
          const shop = shops.find(s => s.id === shopId);
          if (shop) {
            setActiveShop(shop);
            onChange?.(shopId);

            // Invalidate queries that depend on shop ID
            queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory", shopId] });
            queryClient.invalidateQueries({ queryKey: ["/api/orders", shopId] });
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