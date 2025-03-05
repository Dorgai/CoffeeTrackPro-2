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

  const isLoading = loadingUserShops || loadingAllShops;
  const shops = user?.role === "roasteryOwner" ? allShops : userShops;

  // Set default shop when shops data changes
  useEffect(() => {
    if (!shops || shops.length === 0) return;

    if (!activeShop || !shops.find(s => s.id === activeShop.id)) {
      setActiveShop(shops[0]);
      onChange?.(shops[0].id);
    }
  }, [shops, activeShop, setActiveShop, onChange]);

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

  if (!shops || shops.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className || ''}`}>
        <Store className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-2 min-w-[200px] h-9 px-3 rounded-md border">
          <span className="text-sm text-muted-foreground">No shops available</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Store className="h-4 w-4 text-muted-foreground" />
      <Select
        value={activeShop?.id?.toString() || ''}
        onValueChange={(val) => {
          const selectedShop = shops.find(s => s.id === Number(val));
          if (selectedShop) {
            setActiveShop(selectedShop);
            onChange?.(selectedShop.id);
          }
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select a shop" />
        </SelectTrigger>
        <SelectContent>
          {shops.map((shop) => (
            <SelectItem key={shop.id} value={String(shop.id)}>
              {shop.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}