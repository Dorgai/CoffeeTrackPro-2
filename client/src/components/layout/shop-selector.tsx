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
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

interface ShopSelectorProps {
  value?: number | null;
  onChange?: (shopId: number | null) => void;
  className?: string;
}

export function ShopSelector({ value, onChange, className }: ShopSelectorProps) {
  const { activeShop, setActiveShop } = useActiveShop();
  const { user } = useAuth();

  const { data: shopData, isLoading } = useQuery<any[]>({
    queryKey: ["/api/user/shops"],
    enabled: !!user && (user.role === "shopManager" || user.role === "barista" || user.role === "roasteryOwner"),
  });

  // Transform nested shop data into a flat array of shops
  const shops = shopData?.map(item => item.shop).filter(Boolean) || [];

  useEffect(() => {
    if (shops.length > 0 && !activeShop) {
      const defaultShop = shops.find(s => s.id === user?.defaultShopId) || shops[0];
      if (defaultShop) {
        console.log('Setting default shop:', defaultShop);
        setActiveShop(defaultShop);
        if (onChange) {
          onChange(defaultShop.id);
        }
      }
    }
  }, [shops, user?.defaultShopId, activeShop, setActiveShop, onChange]);

  const handleChange = (value: string) => {
    const shopId = value ? parseInt(value, 10) : null;
    const shop = shops.find((s) => s.id === shopId);
    console.log('Selected shop:', shop);

    if (onChange) {
      onChange(shopId);
    }
    setActiveShop(shop || null);
  };

  // Use controlled value if provided, otherwise use context
  const currentValue = value !== undefined ? value : activeShop?.id;
  console.log('Current value:', currentValue);
  console.log('Available shops:', shops);

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Store className="h-4 w-4 text-muted-foreground" />
      <Select
        value={currentValue?.toString() || ""}
        onValueChange={handleChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[200px]">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading shops...</span>
            </div>
          ) : (
            <SelectValue placeholder="Select a shop" />
          )}
        </SelectTrigger>
        <SelectContent>
          {shops.map((shop) => (
            <SelectItem 
              key={shop.id} 
              value={String(shop.id)}
            >
              {shop.name}
            </SelectItem>
          ))}
          {!isLoading && (!shops || shops.length === 0) && (
            <div className="relative flex items-center justify-center py-2 text-sm text-muted-foreground">
              No shops available
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}