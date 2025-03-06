import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShopSelector } from "@/components/shop-selector";
import { useState } from "react";
import { Loader2, Package, Coffee, ShoppingCart, Clock } from "lucide-react";
import type { RetailInventory, Order } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InventoryItem extends RetailInventory {
  coffeeName: string;
  producer: string;
  grade: string;
}

interface OrderItem extends Order {
  coffeeName: string;
  producer: string;
}

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [selectedShopId, setSelectedShopId] = useState<number>();

  // Get inventory data for the selected shop
  const { data: inventory, isLoading: loadingInventory } = useQuery<InventoryItem[]>({
    queryKey: ["/api/retail-inventory", selectedShopId],
    enabled: !!selectedShopId,
  });

  // Get orders for the selected shop
  const { data: orders, isLoading: loadingOrders } = useQuery<OrderItem[]>({
    queryKey: ["/api/orders", selectedShopId],
    enabled: !!selectedShopId,
  });

  // Stats calculation
  const stats = {
    totalSmallBags: inventory?.reduce((sum, item) => sum + (item.smallBags || 0), 0) || 0,
    totalLargeBags: inventory?.reduce((sum, item) => sum + (item.largeBags || 0), 0) || 0,
    pendingOrders: orders?.filter(order => order.status === "pending").length || 0,
    totalOrders: orders?.length || 0,
  };

  if (!selectedShopId) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Shop Manager Dashboard</h1>
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Select a Shop</CardTitle>
            </CardHeader>
            <CardContent>
              <ShopSelector
                value={selectedShopId}
                onChange={(shopId) => setSelectedShopId(shopId)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loadingInventory || loadingOrders) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Shop Manager Dashboard</h1>
        <ShopSelector
          value={selectedShopId}
          onChange={(shopId) => setSelectedShopId(shopId)}
        />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Small Bags in Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSmallBags}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Large Bags in Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLargeBags}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
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
                  <div key={item.id} className="flex justify-between items-center p-2 rounded-lg border">
                    <div>
                      <div className="font-medium">{item.coffeeName}</div>
                      <div className="text-sm text-muted-foreground">{item.producer}</div>
                      <Badge variant="outline" className="mt-1">{item.grade}</Badge>
                    </div>
                    <div className="text-right">
                      <div>{item.smallBags} × 200g</div>
                      <div>{item.largeBags} × 1kg</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="h-[500px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {orders?.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex justify-between items-center p-2 rounded-lg border">
                    <div>
                      <div className="font-medium">{order.coffeeName}</div>
                      <div className="text-sm text-muted-foreground">
                        Status: <Badge variant="outline">{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      {order.smallBags > 0 && <div>{order.smallBags} × 200g</div>}
                      {order.largeBags > 0 && <div>{order.largeBags} × 1kg</div>}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}