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

  // For roasteryOwner, fetch all shops. For others, fetch only assigned shops
  const endpoint = user?.role === "roasteryOwner" ? "/api/shops" : "/api/user/shops";

  const { data: shops, isLoading } = useQuery<Shop[]>({
    queryKey: [endpoint],
  });

  const handleChange = (value: string) => {
    const shopId = value ? parseInt(value, 10) : null;
    const shop = shops?.find((s) => s.id === shopId);

    // Call both the controlled and context handlers
    if (onChange) {
      onChange(shopId);
    }
    setActiveShop(shop || null);
  };

  // Use controlled value if provided, otherwise use context
  const currentValue = value !== undefined ? value : activeShop?.id;

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Store className="h-4 w-4 text-muted-foreground" />
      <Select
        value={currentValue?.toString()}
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
          {shops?.map((shop) => (
            <SelectItem key={shop.id} value={shop.id.toString()}>
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