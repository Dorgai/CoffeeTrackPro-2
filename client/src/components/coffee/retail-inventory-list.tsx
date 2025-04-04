import { useQuery } from "@tanstack/react-query";
import { RetailInventory } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coffee, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InventoryItem {
  id: number | null;
  shopId: number;
  shopName: string;
  shopLocation: string;
  coffeeId: number;
  coffeeName: string;
  producer: string;
  grade: string;
  smallBags: number;
  largeBags: number;
  updatedAt: string | null;
  updatedById: number | null;
  updatedByUsername: string | null;
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
      const res = await apiRequest("POST", "/api/retail-inventory", {
        shopId,
        coffeeId,
        smallBags: 10,
        largeBags: 5,
        updatedById: user?.id
      });

      if (!res.ok) {
        throw new Error("Failed to update inventory");
      }

      // Invalidate queries to refetch data
      await queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory"] });

      toast({
        title: "Inventory updated",
        description: "The stock levels have been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Failed to update inventory",
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
              <TableRow key={`${item.shopId}-${item.coffeeId}`}>
                <TableCell className="font-medium">{item.coffeeName}</TableCell>
                <TableCell>{item.producer}</TableCell>
                <TableCell>
                  <Badge variant="outline">{item.grade}</Badge>
                </TableCell>
                <TableCell>{item.smallBags} × 200g</TableCell>
                <TableCell>{item.largeBags} × 1kg</TableCell>
                <TableCell>
                  {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'Never'}
                </TableCell>
                <TableCell>{item.updatedByUsername || '-'}</TableCell>
                <TableCell>
                  <Button 
                    variant="outline" 
                    onClick={() => handleRestock(item.coffeeId)}
                  >
                    <Package className="h-4 w-4 mr-2" />
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