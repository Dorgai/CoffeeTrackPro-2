import { useQuery } from "@tanstack/react-query";
import { Loader2, Package, ShoppingCart } from "lucide-react";
import { Shop } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { RetailInventoryList } from "@/components/coffee/retail-inventory-list";
import { ShopSelector } from "@/components/layout/shop-selector";
import { useActiveShop } from "@/hooks/use-active-shop";
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

type InventoryItem = {
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
};

type OrderItem = {
  id: number;
  shopId: number;
  coffeeId: number;
  coffeeName: string;
  smallBags: number;
  largeBags: number;
  status: string;
  createdAt: string;
  createdBy: string;
};

export default function RetailOverview() {
  const { user } = useAuth();
  const { activeShop } = useActiveShop();

  // Get user's shops
  const { data: userShops } = useQuery<Shop[]>({
    queryKey: ["/api/user/shops"],
    enabled: user?.role !== "roasteryOwner", // Only fetch for non-roasteryOwner users
  });

  const { data: inventory, isLoading: loadingInventory } = useQuery<InventoryItem[]>({
    queryKey: ["/api/retail-inventory", activeShop?.id],
    queryFn: async () => {
      console.log("Fetching retail inventory for shop:", activeShop?.id);
      const url = activeShop?.id ? `/api/retail-inventory?shopId=${activeShop.id}` : "/api/retail-inventory";
      const res = await apiRequest("GET", url);
      if (!res.ok) {
        throw new Error("Failed to fetch inventory");
      }
      const data = await res.json();
      console.log("Fetched inventory data:", data);
      return data;
    },
    enabled: Boolean(user) // Only fetch when user is logged in
  });

  const { data: orders, isLoading: loadingOrders } = useQuery<OrderItem[]>({
    queryKey: ["/api/orders", activeShop?.id],
    queryFn: async () => {
      const url = activeShop?.id ? `/api/orders?shopId=${activeShop.id}` : "/api/orders";
      const res = await apiRequest("GET", url);
      if (!res.ok) {
        throw new Error("Failed to fetch orders");
      }
      return res.json();
    },
    enabled: Boolean(user)
  });

  if (loadingInventory || loadingOrders) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!inventory) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold tracking-tight">Retail Overview</h1>
        <p className="text-muted-foreground">No inventory data available</p>
      </div>
    );
  }

  // Group inventory by shop with less restrictive filtering
  const shopData = inventory.reduce<Record<number, {
    shopName: string;
    shopLocation: string;
    inventory: InventoryItem[];
    orders: OrderItem[];
  }>>((acc, item) => {
    const { shopId, shopName, shopLocation } = item;

    // If activeShop is selected, only show that shop's data
    if (activeShop?.id && activeShop.id !== shopId) {
      return acc;
    }

    // For roasteryOwner and owner, show all shops
    if (user?.role === "roasteryOwner" || user?.role === "owner" || userShops?.some(s => s.id === shopId)) {
      if (!acc[shopId]) {
        acc[shopId] = {
          shopName,
          shopLocation,
          inventory: [],
          orders: []
        };
      }
      acc[shopId].inventory.push(item);
    }

    return acc;
  }, {});

  // Add orders to the grouped data
  orders?.forEach(order => {
    if (shopData[order.shopId]) {
      shopData[order.shopId].orders.push(order);
    }
  });

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

      {Object.entries(shopData).length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {activeShop?.id ? "No data available for selected shop" : "No shop data available"}
        </div>
      ) : (
        Object.entries(shopData).map(([shopId, data]) => (
          <div key={shopId} className="space-y-6 pb-8 border-b last:border-0">
            <h2 className="text-2xl font-semibold">{data.shopName}</h2>
            <p className="text-muted-foreground">{data.shopLocation}</p>

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
                      <TableHead>Grade</TableHead>
                      <TableHead>Small Bags (200g)</TableHead>
                      <TableHead>Large Bags (1kg)</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Updated By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.inventory.map((item) => (
                      <TableRow key={`${item.shopId}-${item.coffeeId}`}>
                        <TableCell className="font-medium">{item.coffeeName}</TableCell>
                        <TableCell>{item.producer}</TableCell>
                        <TableCell>{item.grade}</TableCell>
                        <TableCell>{item.smallBags}</TableCell>
                        <TableCell>{item.largeBags}</TableCell>
                        <TableCell>{item.updatedAt ? formatDate(item.updatedAt) : 'Never'}</TableCell>
                        <TableCell>{item.updatedByUsername || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {data.inventory.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
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
                      <TableHead>Created By</TableHead>
                      <TableHead>Order Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.coffeeName}</TableCell>
                        <TableCell>{order.smallBags}</TableCell>
                        <TableCell>{order.largeBags}</TableCell>
                        <TableCell className="capitalize">{order.status}</TableCell>
                        <TableCell>{order.createdBy}</TableCell>
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
        ))
      )}
    </div>
  );
}