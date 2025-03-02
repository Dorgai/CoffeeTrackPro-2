import { useQuery } from "@tanstack/react-query";
import { Shop } from "@shared/schema";
import { useActiveShop } from "@/hooks/use-active-shop";
import { apiRequest } from "@/lib/queryClient";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Package } from "lucide-react";
import StockProgress from "@/components/stock-progress";

type InventoryItem = {
  greenCoffeeId: number;
  smallBags: number;
  largeBags: number;
};

export function StockLevelIndicator() {
  const { activeShop } = useActiveShop();

  // Fetch shop details to get target quantities
  const { data: shop } = useQuery<Shop>({
    queryKey: ["/api/shops", activeShop?.id],
    enabled: !!activeShop,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/shops/${activeShop?.id}`);
      if (!res.ok) throw new Error("Failed to fetch shop details");
      return res.json();
    }
  });

  // Fetch current inventory
  const { data: inventory } = useQuery<InventoryItem[]>({
    queryKey: ["/api/retail-inventory", activeShop?.id],
    enabled: !!activeShop,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/retail-inventory?shopId=${activeShop?.id}`);
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json();
    },
  });

  if (!activeShop || !shop?.desiredSmallBags || !shop?.desiredLargeBags || !inventory) {
    return (
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4" />
        <span className="text-sm font-medium">No data</span>
      </div>
    );
  }

  // Calculate current totals
  const totalSmallBags = inventory.reduce((sum, item) => sum + item.smallBags, 0);
  const totalLargeBags = inventory.reduce((sum, item) => sum + item.largeBags, 0);

  // Calculate percentages for both bag types
  const smallBagsPercentage = Math.min(Math.round((totalSmallBags / shop.desiredSmallBags) * 100), 100);
  const largeBagsPercentage = Math.min(Math.round((totalLargeBags / shop.desiredLargeBags) * 100), 100);

  // Use the lower percentage for overall status
  const overallPercentage = Math.min(smallBagsPercentage, largeBagsPercentage);

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer">
          <Package className="h-4 w-4" />
          <div className="flex items-center gap-1">
            <span className={`text-sm font-medium ${overallPercentage < 50 ? 'text-red-500' : ''}`}>
              {overallPercentage}%
            </span>
            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  overallPercentage >= 75 ? "bg-green-500" :
                  overallPercentage >= 50 ? "bg-amber-500" :
                  "bg-red-500"
                }`}
                style={{ width: `${overallPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Stock Level Details</h4>
          <div className="space-y-4">
            <StockProgress
              current={totalSmallBags}
              desired={shop.desiredSmallBags}
              label="Small Bags (200g)"
            />
            <StockProgress
              current={totalLargeBags}
              desired={shop.desiredLargeBags}
              label="Large Bags (1kg)"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Based on your configured target stock levels
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}