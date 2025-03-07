import { useQuery } from "@tanstack/react-query";
import { Loader2, Package, ShoppingCart } from "lucide-react";
import { Shop } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { DispatchedCoffeeConfirmation } from "@/components/coffee/dispatched-coffee-confirmation";
import { InventoryDiscrepancyView } from "@/components/coffee/inventory-discrepancy-view";
import { ShopSelector } from "@/components/layout/shop-selector";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

type AllInventoryItem = {
  id: number;
  shopId: number;
  greenCoffeeId: number;
  smallBags: number;
  largeBags: number;
  updatedAt: string;
  shop: Shop;
  greenCoffee: {
    name: string;
    producer: string;
  };
  updatedBy: {
    username: string;
  };
  coffeeName?: string; //Added to match edited code's assumption.
  producer?: string; //Added to match edited code's assumption.
  updatedByUsername?: string; //Added to match edited code's assumption.

};

type AllOrderItem = {
  id: number;
  shopId: number;
  greenCoffeeId: number;
  smallBags: number;
  largeBags: number;
  status: string;
  createdAt: string;
  shop: Shop;
  greenCoffee: {
    name: string;
  };
  user: {
    username: string;
  };
};

export default function RetailOverview() {
  const { user } = useAuth();

  // Get user's shops
  const { data: userShops } = useQuery<Shop[]>({
    queryKey: ["/api/user/shops"],
    enabled: user?.role !== "roasteryOwner", // Only fetch for non-roasteryOwner users
  });

  const { data: allInventory, isLoading: loadingInventory } = useQuery({
    queryKey: ["/api/retail-inventory"],
    queryFn: async () => {
      console.log("Fetching retail inventory...");
      const res = await apiRequest("GET", "/api/retail-inventory");
      if (!res.ok) {
        throw new Error("Failed to fetch inventory");
      }
      const data = await res.json();
      console.log("Fetched inventory data:", data);
      return data;
    },
  });

  const { data: allOrders, isLoading: loadingOrders } = useQuery({
    queryKey: ["/api/orders"],
  });

  if (loadingInventory || loadingOrders) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!allInventory) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold tracking-tight">Retail Overview</h1>
        <p className="text-muted-foreground">No inventory data available</p>
      </div>
    );
  }

  // Group inventory and orders by shop
  const shopData = allInventory.reduce((acc, item) => {
    if (!item || !item.shopId) {
      console.log("Skipping invalid inventory item:", item);
      return acc;
    }

    const shopId = item.shopId;

    // Only include shops that the user has access to
    if (user?.role !== "roasteryOwner" && !userShops?.some(s => s.id === shopId)) {
      return acc;
    }

    if (!acc[shopId]) {
      acc[shopId] = {
        shop: item.shop,
        inventory: [],
        orders: []
      };
    }

    acc[shopId].inventory.push(item);
    return acc;
  }, {} as Record<number, { shop: Shop; inventory: typeof allInventory; orders: typeof allOrders }>);

  // Add orders to the grouped data
  allOrders?.forEach(order => {
    const shopId = order.shopId;
    if (shopData[shopId]) {
      shopData[shopId].orders.push(order);
    }
  });

  const hasShopData = Object.keys(shopData).length > 0;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Retail Overview</h1>
        <p className="text-muted-foreground">
          Monitor inventory and orders across retail locations
        </p>
      </div>

      <div className="mb-6">
        <ShopSelector />
      </div>

      {user?.role === "roasteryOwner" && <InventoryDiscrepancyView />}

      {!hasShopData && (
        <div className="text-center py-8 text-muted-foreground">
          No shop data available
        </div>
      )}

      {Object.entries(shopData).map(([shopId, data]) => {
        if (!data.shop) {
          console.log("Skipping shop without data:", shopId);
          return null;
        }

        return (
          <div key={shopId} className="space-y-6 pb-8 border-b last:border-0">
            <h2 className="text-2xl font-semibold">{data.shop.name}</h2>
            <p className="text-muted-foreground">{data.shop.location}</p>

            {["owner", "roasteryOwner", "shopManager", "barista"].includes(user?.role || "") && (
              <DispatchedCoffeeConfirmation shopId={parseInt(shopId)} />
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  <CardTitle>Current Inventory</CardTitle>
                </div>
                <CardDescription>Available stock in this location</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coffee</TableHead>
                      <TableHead>Producer</TableHead>
                      <TableHead>Small Bags (200g)</TableHead>
                      <TableHead>Large Bags (1kg)</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Updated By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.inventory.map((item) => (
                      <TableRow key={`${item.shopId}-${item.greenCoffeeId}`}>
                        <TableCell className="font-medium">{item.greenCoffee?.name || item.coffeeName || '-'}</TableCell>
                        <TableCell>{item.greenCoffee?.producer || item.producer || '-'}</TableCell>
                        <TableCell>{item.smallBags || 0}</TableCell>
                        <TableCell>{item.largeBags || 0}</TableCell>
                        <TableCell>{item.updatedAt ? formatDate(item.updatedAt) : 'Never'}</TableCell>
                        <TableCell>{item.updatedBy?.username || item.updatedByUsername || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {data.inventory.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No inventory items found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  <CardTitle>Recent Orders</CardTitle>
                </div>
                <CardDescription>Orders from this location</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coffee</TableHead>
                      <TableHead>Small Bags</TableHead>
                      <TableHead>Large Bags</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ordered By</TableHead>
                      <TableHead>Order Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.greenCoffee?.name || '-'}</TableCell>
                        <TableCell>{order.smallBags}</TableCell>
                        <TableCell>{order.largeBags}</TableCell>
                        <TableCell className="capitalize">{order.status}</TableCell>
                        <TableCell>{order.user?.username || '-'}</TableCell>
                        <TableCell>{formatDate(order.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                    {data.orders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No orders found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}