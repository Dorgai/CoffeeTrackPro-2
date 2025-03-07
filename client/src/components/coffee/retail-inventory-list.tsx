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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InventoryItem extends RetailInventory {
  coffeeName: string;
  producer: string;
  grade: string;
  updatedBy: string | null;
  smallBags: number;
  largeBags: number;
  updatedAt: string | null;
}

export function RetailInventoryList({ shopId }: { shopId?: number }) {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: inventory, isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/retail-inventory", shopId],
    queryFn: async () => {
      console.log("Fetching inventory for shop:", shopId);
      const url = shopId ? `/api/retail-inventory?shopId=${shopId}` : "/api/retail-inventory";
      const res = await apiRequest("GET", url);
      if (!res.ok) {
        throw new Error("Failed to fetch inventory");
      }
      const data = await res.json();
      console.log("Fetched inventory data:", data);
      return data;
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coffee className="h-5 w-5" />
          Inventory Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Coffee</TableHead>
              <TableHead>Producer</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Small Bags (200g)</TableHead>
              <TableHead>Large Bags (1kg)</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Updated By</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory?.map((item) => (
              <TableRow key={`${item.shopId}-${item.greenCoffeeId}`}>
                <TableCell>{item.coffeeName}</TableCell>
                <TableCell>{item.producer}</TableCell>
                <TableCell>
                  <Badge variant="outline">{item.grade}</Badge>
                </TableCell>
                <TableCell>{item.smallBags || 0} × 200g</TableCell>
                <TableCell>{item.largeBags || 0} × 1kg</TableCell>
                <TableCell>
                  {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'Never'}
                </TableCell>
                <TableCell>{item.updatedBy || '-'}</TableCell>
                <TableCell>
                  <Button 
                    variant="outline" 
                    onClick={() => handleRestock(item.greenCoffeeId)}
                  >
                    Restock
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(!inventory || inventory.length === 0) && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No inventory items found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}