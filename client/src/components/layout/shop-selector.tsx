
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
import { Store, Loader2, AlertCircle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export function ShopSelector({ value, onChange }: { value?: number | null, onChange?: (shopId: number) => void }) {
  const { activeShop, setActiveShop } = useActiveShop();
  const { user } = useAuth();

  const { data: shops, isLoading, error } = useQuery<Shop[]>({
    queryKey: ["/api/user/shops"],
    enabled: !!user, // Only run query if user is authenticated
    staleTime: 30000,
    retry: 2,
    onError: (error) => {
      console.error("Error loading shops:", error);
    }
  });

  // Handle loading state
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

  // Handle authentication error
  if (error) {
    return (
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <div className="flex items-center gap-2 min-w-[200px] h-9 px-3 rounded-md border border-destructive">
          <span className="text-sm text-destructive">Authentication error</span>
        </div>
      </div>
    );
  }

  const validShops = Array.isArray(shops) ? shops : [];

  // Handle no shops available
  if (validShops.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Store className="h-4 w-4" />
        <div className="flex items-center gap-2 min-w-[200px] h-9 px-3 rounded-md border">
          <span className="text-sm text-muted-foreground">No shops available</span>
        </div>
      </div>
    );
  }

  // Set first shop as active if none selected
  if (!activeShop && validShops.length > 0 && !value) {
    const defaultShop = validShops[0];
    setActiveShop(defaultShop);
    if (onChange) {
      onChange(defaultShop.id);
    }
    queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory", defaultShop.id] });
  }

  // Determine which value to use (passed value or from store)
  const currentShopId = value !== undefined ? value : activeShop?.id;

  return (
    <div className="flex items-center gap-2">
      <Store className="h-4 w-4" />
      <Select
        value={currentShopId?.toString()}
        onValueChange={(value) => {
          const selectedShop = validShops.find(s => s.id === Number(value));
          if (selectedShop) {
            setActiveShop(selectedShop);
            if (onChange) {
              onChange(selectedShop.id);
            }
            queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory", selectedShop.id] });
          }
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue>
            {validShops.find(s => s.id === currentShopId)?.name || "Select a shop"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {validShops.map((shop) => (
            <SelectItem key={shop.id} value={shop.id.toString()}>
              {shop.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
