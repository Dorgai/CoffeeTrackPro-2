import { useQuery } from "@tanstack/react-query";
import { RetailInventory } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Coffee, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface InventoryItem extends RetailInventory {
  coffeeName: string;
  producer: string;
  grade: string;
}

export function RetailInventoryList({ shopId }: { shopId?: number }) {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: inventory, isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/retail-inventory", shopId],
    queryFn: async () => {
      const url = shopId ? `/api/retail-inventory?shopId=${shopId}` : "/api/retail-inventory";
      const res = await apiRequest("GET", url);
      if (!res.ok) {
        throw new Error("Failed to fetch inventory");
      }
      return res.json();
    },
    enabled: Boolean(user),
  });

  const handleRestock = async (coffeeId: number) => {
    if (!shopId) return;
    
    try {
      const res = await apiRequest("POST", "/api/orders", {
        shopId,
        greenCoffeeId: coffeeId,
        smallBags: 10,
        largeBags: 5,
        status: "pending"
      });

      if (!res.ok) {
        throw new Error("Failed to create restock order");
      }

      toast({
        title: "Restock order created",
        description: "Your order has been sent to the roastery",
      });
    } catch (error) {
      toast({
        title: "Failed to create restock order",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center">Loading inventory...</div>;
  }

  return (
    <Card className="h-[500px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coffee className="h-5 w-5" />
          Inventory Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {inventory?.map((item) => (
              <div key={`${item.shopId}-${item.greenCoffeeId}`} className="flex justify-between items-center p-2 rounded-lg border">
                <div>
                  <div className="font-medium">{item.coffeeName}</div>
                  <div className="text-sm text-muted-foreground">{item.producer}</div>
                  <Badge variant="outline" className="mt-1">{item.grade}</Badge>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span>{item.smallBags} × 200g</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span>{item.largeBags} × 1kg</span>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => handleRestock(item.greenCoffeeId)}
                    className="ml-4"
                  >
                    Restock
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
