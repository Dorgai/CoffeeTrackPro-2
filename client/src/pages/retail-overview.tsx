import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Package, ShoppingCart } from "lucide-react";
import { Shop } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RetailInventoryList } from "@/components/coffee/retail-inventory-list";
import { ShopSelector } from "@/components/layout/shop-selector";
import { useActiveShop } from "@/hooks/use-active-shop";
import { useToast } from "@/hooks/use-toast";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

type InventoryItem = {
  id: number | null;
  shopId: number;
  shopName: string;
  shopLocation: string;
  coffeeId: number;
  coffeeName: string;
  producer: string;
  country: string;
  grade: string;
  smallBags: number;
  largeBags: number;
  pendingSmallBags: number;
  pendingLargeBags: number;
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

const ORDER_STATUS_SEQUENCE = {
  pending: ["roasted"],
  roasted: ["dispatched"],
  dispatched: ["delivered"],
  delivered: [],
};

export default function RetailOverview() {
  const { user } = useAuth();
  const { activeShop } = useActiveShop();
  const { toast } = useToast();

  const { data: userShops } = useQuery<Shop[]>({
    queryKey: ["/api/user/shops"],
    enabled: user?.role !== "roasteryOwner",
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
    enabled: Boolean(user)
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

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
      if (!res.ok) {
        throw new Error("Failed to update order status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update order status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper function to get allowed next statuses
  const getNextStatuses = (currentStatus: string): string[] => {
    if (user?.role === "roasteryOwner") {
      // Roastery owners can set any status except going backwards
      const allStatuses = ["pending", "roasted", "dispatched", "delivered"];
      const currentIndex = allStatuses.indexOf(currentStatus);
      return allStatuses.slice(currentIndex + 1);
    }
    // For retail owners and others, use the sequence map
    return ORDER_STATUS_SEQUENCE[currentStatus] || [];
  };

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

  const shopData = inventory.reduce<Record<number, {
    shopName: string;
    shopLocation: string;
    inventory: InventoryItem[];
    orders: OrderItem[];
  }>>((acc, item) => {
    const { shopId, shopName, shopLocation } = item;

    if (activeShop?.id && activeShop.id !== shopId) {
      return acc;
    }

    if (user?.role === "roasteryOwner" || userShops?.some(s => s.id === shopId)) {
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
                  <CardTitle>Coffee Inventory</CardTitle>
                </div>
                <CardDescription>Available stock in this location</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coffee</TableHead>
                      <TableHead>Producer</TableHead>
                      <TableHead>Origin</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Small Bags (200g)</TableHead>
                      <TableHead>Large Bags (1kg)</TableHead>
                      <TableHead>Pending Order</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Updated By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.inventory.map((item) => (
                      <TableRow key={`${item.shopId}-${item.coffeeId}`}>
                        <TableCell className="font-medium">{item.coffeeName}</TableCell>
                        <TableCell>{item.producer}</TableCell>
                        <TableCell>{item.country}</TableCell>
                        <TableCell>{item.grade}</TableCell>
                        <TableCell>{item.smallBags}</TableCell>
                        <TableCell>{item.largeBags}</TableCell>
                        <TableCell>
                          {item.pendingSmallBags > 0 || item.pendingLargeBags > 0 ? (
                            <span className="text-sm">
                              {item.pendingSmallBags > 0 && `${item.pendingSmallBags} small`}
                              {item.pendingSmallBags > 0 && item.pendingLargeBags > 0 && ', '}
                              {item.pendingLargeBags > 0 && `${item.pendingLargeBags} large`}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{item.updatedAt ? formatDate(item.updatedAt) : 'Never'}</TableCell>
                        <TableCell>{item.updatedByUsername || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {data.inventory.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
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
                      {(user?.role === "retailOwner" || user?.role === "roasteryOwner") && (
                        <TableHead>Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.orders.map((order) => {
                      const nextStatuses = getNextStatuses(order.status);
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.coffeeName}</TableCell>
                          <TableCell>{order.smallBags}</TableCell>
                          <TableCell>{order.largeBags}</TableCell>
                          <TableCell className="capitalize">{order.status}</TableCell>
                          <TableCell>{order.createdBy}</TableCell>
                          <TableCell>{formatDate(order.createdAt)}</TableCell>
                          {(user?.role === "retailOwner" || user?.role === "roasteryOwner") && (
                            <TableCell>
                              {user?.role === "retailOwner" ? (
                                order.status === "dispatched" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updateOrderStatusMutation.mutate({
                                        orderId: order.id,
                                        status: "delivered",
                                      })
                                    }
                                    disabled={updateOrderStatusMutation.isPending || order.status === "delivered"}
                                  >
                                    {updateOrderStatusMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      "Mark as Delivered"
                                    )}
                                  </Button>
                                )
                              ) : (
                                nextStatuses.length > 0 && (
                                  <Select
                                    defaultValue={order.status}
                                    onValueChange={(value) =>
                                      updateOrderStatusMutation.mutate({
                                        orderId: order.id,
                                        status: value,
                                      })
                                    }
                                    disabled={updateOrderStatusMutation.isPending}
                                  >
                                    <SelectTrigger className="w-[130px]">
                                      <SelectValue placeholder="Change status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {nextStatuses.map((status) => (
                                        <SelectItem key={status} value={status}>
                                          {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                    {data.orders.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={(user?.role === "retailOwner" || user?.role === "roasteryOwner") ? 7 : 6}
                          className="text-center text-muted-foreground"
                        >
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