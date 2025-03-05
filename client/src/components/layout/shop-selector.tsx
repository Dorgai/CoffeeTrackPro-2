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

export function ShopSelector() {
  const { activeShop, setActiveShop } = useActiveShop();

  const { data: shops, isLoading, error } = useQuery<Shop[]>({
    queryKey: ["/api/user/shops"],
    staleTime: 30000,
    retry: 2,
    onError: (error) => {
      console.error("Error loading shops:", error);
    }
  });

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

  const validShops = Array.isArray(shops) ? shops : [];

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
  if (!activeShop && validShops.length > 0) {
    const defaultShop = validShops[0];
    setActiveShop(defaultShop);
    queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory", defaultShop.id] });
  }

  return (
    <div className="flex items-center gap-2">
      <Store className="h-4 w-4" />
      <Select
        value={activeShop?.id.toString()}
        onValueChange={(value) => {
          const selectedShop = validShops.find(s => s.id === Number(value));
          if (selectedShop) {
            setActiveShop(selectedShop);
            queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory", selectedShop.id] });
          }
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue>
            {activeShop?.name || "Select a shop"}
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