import { useQuery } from "@tanstack/react-query";
import { Shop } from "@shared/schema";
import { useActiveShop } from "@/hooks/use-active-shop";
import { apiRequest } from "@/lib/queryClient";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import { Package } from "lucide-react";

type InventoryItem = {
  greenCoffeeId: number;
  smallBags: number;
  largeBags: number;
};

export function StockLevelIndicator() {
  const { activeShop } = useActiveShop();

  // Fetch shop details to get default order quantity
  const { data: shop } = useQuery<Shop>({
    queryKey: ["/api/shops", activeShop?.id],
    enabled: !!activeShop,
  });

  // Fetch current inventory
  const { data: inventory } = useQuery<InventoryItem[]>({
    queryKey: ["/api/retail-inventory", activeShop?.id],
    enabled: !!activeShop,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/retail-inventory?shopId=${activeShop?.id}`);
      return res.json();
    },
  });

  // Fetch all available coffees
  const { data: coffees } = useQuery<any[]>({
    queryKey: ["/api/green-coffee"],
    enabled: !!activeShop,
  });

  if (!activeShop || !shop?.defaultOrderQuantity || !inventory || !coffees) {
    return null;
  }

  // Calculate total desired stock
  const desiredStock = shop.defaultOrderQuantity * coffees.length;

  // Calculate current total stock
  const currentStock = inventory.reduce((total, item) => total + item.smallBags + item.largeBags, 0);

  // Calculate stock level percentage
  const stockPercentage = Math.min(Math.round((currentStock / desiredStock) * 100), 100);

  // Determine stock level status
  const getStockStatus = () => {
    if (stockPercentage >= 75) return "bg-green-500";
    if (stockPercentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer">
          <Package className="h-4 w-4" />
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium">{stockPercentage}%</span>
            <Progress 
              value={stockPercentage} 
              className="w-24 h-2"
              indicatorClassName={getStockStatus()}
            />
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Stock Level Details</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Current Stock:</p>
              <p className="font-medium">{currentStock} bags</p>
            </div>
            <div>
              <p className="text-muted-foreground">Target Stock:</p>
              <p className="font-medium">{desiredStock} bags</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Based on {shop.defaultOrderQuantity} bags per coffee type × {coffees.length} coffee types
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
