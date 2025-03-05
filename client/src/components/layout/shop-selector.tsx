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
import { useAuth } from "@/hooks/use-auth";

interface ShopSelectorProps {
  value?: number | null;
  onChange?: (shopId: number | null) => void;
  className?: string;
}

export function ShopSelector({ value, onChange, className }: ShopSelectorProps) {
  const { activeShop, setActiveShop } = useActiveShop();
  const { user } = useAuth();

  // Fetch user's authorized shops
  const { data: userShops, isLoading: loadingUserShops } = useQuery<Shop[]>({
    queryKey: ["/api/user/shops"],
    enabled: !!user && user.role !== "roasteryOwner",
  });

  // Fetch all shops for roasteryOwner
  const { data: allShops, isLoading: loadingAllShops } = useQuery<Shop[]>({
    queryKey: ["/api/shops"],
    enabled: !!user && user.role === "roasteryOwner",
  });

  // Set default shop when shops data changes
  useEffect(() => {
    const shops = user?.role === "roasteryOwner" ? allShops : userShops;
    if (!shops?.length) return;

    // If no active shop or current shop is not in available shops
    if (!activeShop || !shops.find(s => s.id === activeShop.id)) {
      const defaultShop = shops[0];
      setActiveShop(defaultShop);
      if (onChange) {
        onChange(defaultShop.id);
      }
    }
  }, [userShops, allShops, activeShop, setActiveShop, onChange, user?.role]);

  const handleChange = (value: string) => {
    const shopId = value ? parseInt(value, 10) : null;
    const shops = user?.role === "roasteryOwner" ? allShops : userShops;
    const shop = shops?.find((s) => s.id === shopId);

    if (onChange) {
      onChange(shopId);
    }
    setActiveShop(shop || null);
  };

  const isLoading = loadingUserShops || loadingAllShops;
  const shops = user?.role === "roasteryOwner" ? allShops : userShops;
  const currentValue = value !== undefined ? value : activeShop?.id;

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className || ''}`}>
        <Store className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-2 min-w-[200px] h-9 px-3 rounded-md border">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading shops...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Store className="h-4 w-4 text-muted-foreground" />
      <Select
        value={currentValue ? `${currentValue}` : undefined}
        onValueChange={handleChange}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select a shop" />
        </SelectTrigger>
        <SelectContent>
          {shops?.map((shop) => (
            <SelectItem key={shop.id} value={`${shop.id}`}>
              {shop.name}
            </SelectItem>
          ))}
          {(!shops || shops.length === 0) && (
            <div className="relative flex items-center justify-center py-2 text-sm text-muted-foreground">
              No shops available
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}