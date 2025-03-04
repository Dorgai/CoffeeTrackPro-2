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

interface UserShopResponse {
  user_shops: {
    userId: number;
    shopId: number;
  };
  shop: Shop;
}

export function ShopSelector({ value, onChange, className }: ShopSelectorProps) {
  const { activeShop, setActiveShop } = useActiveShop();
  const { user } = useAuth();

  const { data: userShops, isLoading } = useQuery<UserShopResponse[]>({
    queryKey: ["/api/user/shops"],
    enabled: !!user && (user.role === "shopManager" || user.role === "barista"),
    retry: 1,
  });

  const shops = userShops?.map(item => item.shop).filter(Boolean) || [];

  useEffect(() => {
    if (shops.length > 0 && !activeShop) {
      const defaultShop = shops.find(s => s.id === user?.defaultShopId) || shops[0];
      if (defaultShop) {
        setActiveShop(defaultShop);
        onChange?.(defaultShop.id);
      }
    }
  }, [shops, user?.defaultShopId, activeShop, setActiveShop, onChange]);

  const handleChange = (value: string) => {
    const shopId = value ? parseInt(value, 10) : null;
    const shop = shops.find((s) => s.id === shopId);

    onChange?.(shopId);
    setActiveShop(shop || null);
  };

  if (!user || (user.role !== "shopManager" && user.role !== "barista")) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Store className="h-4 w-4 text-muted-foreground" />
      <Select
        value={String(value ?? activeShop?.id ?? '')}
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
          {!isLoading && shops.map((shop) => (
            <SelectItem 
              key={shop.id} 
              value={String(shop.id)}
            >
              {shop.name}
            </SelectItem>
          ))}
          {!isLoading && shops.length === 0 && (
            <div className="relative flex items-center justify-center py-2 text-sm text-muted-foreground">
              No shops available
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}