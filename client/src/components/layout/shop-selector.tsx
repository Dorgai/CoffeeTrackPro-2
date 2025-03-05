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
import { apiRequest } from "@/lib/queryClient";

interface ShopSelectorProps {
  value?: number | null;
  onChange?: (shopId: number | null) => void;
  className?: string;
}

export function ShopSelector({ value, onChange, className }: ShopSelectorProps) {
  const { activeShop, setActiveShop } = useActiveShop();
  const { user } = useAuth();

  // Fetch user's authorized shops for barista/manager
  const { data: userShops, isLoading: loadingUserShops } = useQuery<Shop[]>({
    queryKey: ["/api/user/shops"],
    enabled: !!user && user.role !== "roasteryOwner",
    queryFn: async () => {
      console.log("Fetching user shops for role:", user?.role);
      const res = await apiRequest("GET", "/api/user/shops");
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Failed to fetch user shops: ${error}`);
      }
      const data = await res.json();
      console.log("Fetched user shops:", data);
      return data;
    },
    staleTime: 30000,
    retry: 3,
  });

  // Fetch all shops for roasteryOwner
  const { data: allShops, isLoading: loadingAllShops } = useQuery<Shop[]>({
    queryKey: ["/api/shops"],
    enabled: !!user && user.role === "roasteryOwner",
    staleTime: 30000,
    retry: 3,
  });

  // Set default shop on mount and when shops data changes
  useEffect(() => {
    const shops = user?.role === "roasteryOwner" ? allShops : userShops;
    if (shops && shops.length > 0 && !activeShop) {
      console.log("Setting default shop. Available shops:", shops);
      const defaultShop = shops.find(s => s.id === user?.defaultShopId) || shops[0];
      console.log("Selected default shop:", defaultShop);
      setActiveShop(defaultShop);
      if (onChange) {
        onChange(defaultShop.id);
      }
    }
  }, [userShops, allShops, user?.defaultShopId, activeShop, setActiveShop, onChange, user?.role]);

  const handleChange = (value: string) => {
    const shopId = value ? parseInt(value, 10) : null;
    const shops = user?.role === "roasteryOwner" ? allShops : userShops;
    const shop = shops?.find((s) => s.id === shopId);
    console.log("Changing shop to:", shop);

    if (onChange) {
      onChange(shopId);
    }
    setActiveShop(shop || null);
  };

  const isLoading = loadingUserShops || loadingAllShops;
  const shops = user?.role === "roasteryOwner" ? allShops : userShops;
  const currentValue = value !== undefined ? value : activeShop?.id;

  // If no shops are loaded yet, show loading state
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