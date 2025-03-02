import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { GreenCoffee, RoastingBatch, RetailInventory, Shop, CoffeeLargeBagTarget } from "@shared/schema";
import { format } from 'date-fns';

// UI components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Coffee,
  Package,
  Store,
  Loader2,
  AlertTriangle,
  LogOut,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Custom components
import { ShopSelector } from "@/components/layout/shop-selector";
import StockProgress from "@/components/stock-progress";
import { TargetEditorDialog } from "@/components/coffee/target-editor-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";


type Order = {
  id: number;
  shopId: number;
  greenCoffeeId: number;
  smallBags: number;
  largeBags: number;
  status: string;
  createdAt: string;
  shop: {
    name: string;
    location: string;
    desiredSmallBags?: number;
    desiredLargeBags?: number;
  };
  greenCoffee: {
    name: string;
    producer: string;
  };
};

// Helper function to calculate days since a date
function getDaysSince(date: string) {
  const orderDate = new Date(date);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - orderDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Helper function to group orders by shop
function groupOrdersByShop(orders: Order[]) {
  const groups: Record<string, Order[]> = {};
  orders.forEach(order => {
    const shopName = order.shop?.name || `Shop #${order.shopId}`;
    if (!groups[shopName]) {
      groups[shopName] = [];
    }
    groups[shopName].push(order);
  });
  return groups;
}

function StatsCard({
  title,
  value,
  icon: Icon,
  description
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);

  // Get shop details
  const { data: shop, isLoading: loadingShop } = useQuery<Shop>({
    queryKey: ["/api/shops", selectedShopId],
    queryFn: async () => {
      if (!selectedShopId) throw new Error("No shop selected");
      const res = await apiRequest("GET", `/api/shops/${selectedShopId}`);
      if (!res.ok) throw new Error("Failed to fetch shop details");
      return res.json();
    },
    enabled: !!selectedShopId,
  });

  // Get current inventory
  const { data: currentInventory, isLoading: loadingInventory } = useQuery<RetailInventory[]>({
    queryKey: ["/api/retail-inventory"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/retail-inventory");
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json();
    },
    enabled: !!user,
  });

  // Get all coffees
  const { data: coffees, isLoading: loadingCoffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
    enabled: !!user,
  });

  // Get coffee targets
  const { data: coffeeTargets } = useQuery<CoffeeLargeBagTarget[]>({
    queryKey: ["/api/shops", selectedShopId, "coffee-targets"],
    queryFn: async () => {
      if (!selectedShopId) throw new Error("No shop selected");
      const res = await apiRequest("GET", `/api/shops/${selectedShopId}/coffee-targets`);
      if (!res.ok) throw new Error("Failed to fetch coffee targets");
      return res.json();
    },
    enabled: !!selectedShopId && (user?.role === "roasteryOwner" || user?.role === "shopManager"),
  });

  // Get orders
  const { data: orders, isLoading: loadingOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/orders");
      if (!res.ok) {
        throw new Error("Failed to fetch orders");
      }
      return res.json();
    },
    enabled: !!user,
  });

  // Get previous inventory history
  const { data: previousInventory } = useQuery<RetailInventory[]>({
    queryKey: ["/api/retail-inventory/history"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/retail-inventory/history");
      if (!res.ok) {
        throw new Error("Failed to fetch inventory history");
      }
      return res.json();
    },
    enabled: !!user,
  });

  // Filter inventory data based on selected shop
  const filteredInventory = selectedShopId && currentInventory
    ? currentInventory.filter(item => item.shopId === selectedShopId)
    : [];

  // Loading state
  if (loadingCoffees || loadingInventory || loadingOrders || loadingShop) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Shop manager and barista view
  if (user?.role === "shopManager" || user?.role === "barista") {
    const pendingOrdersByShop = orders
      ? groupOrdersByShop(orders.filter(order => order.status === "pending"))
      : {};

    const getShopsToShow = () => {
      if (!orders || !currentInventory) return [];

      if (user?.role === "barista" && selectedShopId) {
        const shopName = currentInventory.find(inv => inv.shopId === selectedShopId)?.shop?.name;
        return [{ id: selectedShopId, name: shopName || "Selected Shop" }];
      }

      return orders
        .filter(order => order.shop)
        .reduce((shops, order) => {
          if (order.shop && !shops.some(s => s.id === order.shopId)) {
            shops.push({ id: order.shopId, name: order.shop.name });
          }
          return shops;
        }, [] as Array<{ id: number; name: string }>);
    };

    const filteredOrders = orders?.filter(order => order.shopId === selectedShopId) || [];

    // Calculate inventory changes
    const inventoryWithChanges = currentInventory?.map(current => {
      const previous = previousInventory?.find(prev =>
        prev.shopId === current.shopId &&
        prev.greenCoffeeId === current.greenCoffeeId
      );

      return {
        ...current,
        smallBagChange: previous ? current.smallBags - previous.smallBags : 0,
        largeBagChange: previous ? current.largeBags - previous.largeBags : 0
      };
    });

    // Calculate pending orders with age information
    const pendingOrders = orders?.filter(o => o.status === "pending") || [];
    const oldestPendingOrder = pendingOrders.reduce((oldest, order) => {
      const orderDays = getDaysSince(order.createdAt);
      return orderDays > oldest ? orderDays : oldest;
    }, 0);

    // Find the most recent order date from all orders
    const lastOrderDate = orders?.reduce((latest, order) => {
      const orderDate = new Date(order.createdAt);
      return latest > orderDate ? latest : orderDate;
    }, new Date(0));


    return (
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.username}</h1>
            <p className="text-muted-foreground">Manage your coffee shop inventory</p>
          </div>
          <ShopSelector
            value={selectedShopId}
            onChange={setSelectedShopId}
          />
        </div>

        {/* Stock Overview Section */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Global Stock Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Overview</CardTitle>
              <CardDescription>Current inventory levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!selectedShopId ? (
                  <p className="text-muted-foreground text-center py-4">
                    Please select a shop to view inventory
                  </p>
                ) : shop && filteredInventory ? (
                  <div className="space-y-4 pb-4">
                    <h3 className="font-medium text-lg">{shop.name}</h3>
                    <div className="space-y-2">
                      <StockProgress
                        current={filteredInventory.reduce((sum, inv) => sum + (inv.smallBags || 0), 0)}
                        desired={shop.desiredSmallBags || 0}
                        label="Small Bags (200g)"
                      />
                      <StockProgress
                        current={filteredInventory.reduce((sum, inv) => sum + (inv.largeBags || 0), 0)}
                        desired={shop.desiredLargeBags || 0}
                        label="Large Bags (1kg)"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No inventory data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Individual Coffee Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Coffee Inventory</CardTitle>
              <CardDescription>Stock levels by coffee type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {!selectedShopId ? (
                  <p className="text-muted-foreground text-center py-4">
                    Please select a shop to view inventory
                  </p>
                ) : (
                  coffees?.map(coffee => {
                    const shopInventory = filteredInventory?.find(inv =>
                      inv.greenCoffeeId === coffee.id
                    );

                    if (!shopInventory) return null;

                    return (
                      <div key={coffee.id} className="space-y-4">
                        <div>
                          <h3 className="font-medium">{coffee.name}</h3>
                          {coffee.producer && (
                            <p className="text-sm text-muted-foreground">{coffee.producer}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <StockProgress
                            current={shopInventory.smallBags || 0}
                            desired={shop?.desiredSmallBags || 0}
                            label="Small Bags (200g)"
                          />
                          <StockProgress
                            current={shopInventory.largeBags || 0}
                            desired={shop?.desiredLargeBags || 0}
                            label="Large Bags (1kg)"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
                {selectedShopId && (!filteredInventory || filteredInventory.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">
                    No inventory data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Orders */}
        {user?.role === "shopManager" && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Orders</CardTitle>
              <CardDescription>Orders awaiting processing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(pendingOrdersByShop).map(([shopName, shopOrders]) => (
                  <div key={shopName} className="space-y-3">
                    <h3 className="font-medium text-lg">{shopName}</h3>
                    <div className="space-y-2">
                      {shopOrders.map(order => {
                        const coffee = coffees?.find(c => c.id === order.greenCoffeeId);
                        return (
                          <div key={order.id} className="p-3 bg-muted rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{coffee?.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Ordered: {new Date(order.createdAt).toLocaleDateString()} ({getDaysSince(order.createdAt)} days ago)
                                </p>
                              </div>
                              <Badge variant="destructive">Pending {getDaysSince(order.createdAt)}d</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                              <div className="text-sm">Small Bags: {order.smallBags}</div>
                              <div className="text-sm">Large Bags: {order.largeBags}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {Object.keys(pendingOrdersByShop).length === 0 && (
                  <p className="text-center text-muted-foreground">No pending orders</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Roastery owner and roaster view (default)
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.username}</h1>
          <p className="text-muted-foreground">Coffee roasting operations overview</p>
        </div>
        <div className="flex gap-2">
          {user?.role === "roasteryOwner" && (
            <Button asChild>
              <Link href="/inventory">Manage Inventory</Link>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Shops"
          value={orders ? new Set(orders.map(o => o.shopId)).size : 0}
          icon={Store}
        />
        <StatsCard
          title="Coffee Types"
          value={coffees ? coffees.length : 0}
          icon={Coffee}
        />
        <StatsCard
          title="Pending Orders"
          value={orders ? orders.filter(o => o.status === "pending").length : 0}
          icon={Package}
        />
        <StatsCard
          title="Low Stock Items"
          value={coffees ? coffees.filter(c => Number(c.currentStock) <= Number(c.minThreshold)).length : 0}
          icon={AlertTriangle}
        />
      </div>
    </div>
  );
}