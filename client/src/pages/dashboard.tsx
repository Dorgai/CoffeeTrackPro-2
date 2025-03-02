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

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);

  // Basic shop data query
  const { data: shop, isLoading: loadingShop } = useQuery<Shop>({
    queryKey: ["/api/shops", selectedShopId],
    queryFn: async () => {
      console.log("Fetching shop data for ID:", selectedShopId);
      const res = await apiRequest("GET", `/api/shops/${selectedShopId}`);
      if (!res.ok) throw new Error("Failed to fetch shop details");
      const data = await res.json();
      console.log("Shop data received:", data);
      return data;
    },
    enabled: !!selectedShopId,
  });

  // Simplified inventory query
  const { data: inventory, isLoading: loadingInventory } = useQuery<RetailInventory[]>({
    queryKey: ["/api/retail-inventory"],
    queryFn: async () => {
      console.log("Fetching inventory data");
      const res = await apiRequest("GET", "/api/retail-inventory");
      if (!res.ok) throw new Error("Failed to fetch inventory");
      const data = await res.json();
      console.log("Inventory data received:", data);
      return data;
    },
    enabled: !!user,
  });

  // Basic coffee data query
  const { data: coffees, isLoading: loadingCoffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
    queryFn: async () => {
      console.log("Fetching coffee data");
      const res = await apiRequest("GET", "/api/green-coffee");
      if (!res.ok) throw new Error("Failed to fetch coffee data");
      const data = await res.json();
      console.log("Coffee data received:", data);
      return data;
    },
    enabled: !!user,
  });

  // Get orders
  const { data: orders, isLoading: loadingOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled: !!user,
  });

  // Loading state
  if (loadingShop || loadingInventory || loadingCoffees || loadingOrders) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Filter inventory for selected shop
  const shopInventory = selectedShopId && inventory
    ? inventory.filter(item => item.shopId === selectedShopId)
    : [];

  // Calculate key metrics for roastery owner
  const lowStockCoffees = coffees?.filter(coffee =>
    Number(coffee.currentStock) <= Number(coffee.minThreshold)
  ) || [];

  const pendingOrders = orders?.filter(order =>
    order.status === "pending"
  ) || [];

  // If user is roastery owner, show the roastery dashboard
  if (user?.role === "roasteryOwner") {
    return (
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.username}</h1>
            <p className="text-muted-foreground">Coffee roasting operations overview</p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/inventory">Manage Inventory</Link>
            </Button>
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
            value={pendingOrders.length}
            icon={Package}
          />
          <StatsCard
            title="Low Stock Items"
            value={lowStockCoffees.length}
            icon={AlertTriangle}
          />
        </div>

        {/* Low Stock Alerts */}
        {lowStockCoffees.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-500">Low Stock Alerts</CardTitle>
              <CardDescription>Coffee types below minimum threshold</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockCoffees.map(coffee => (
                  <div key={coffee.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{coffee.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Current stock: {coffee.currentStock}kg
                      </p>
                    </div>
                    <Badge variant="destructive">Below Threshold</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Coffee Inventory Overview</CardTitle>
            <CardDescription>Current stock levels across all shops</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {inventory?.map(inv => {
                const coffee = coffees?.find(c => c.id === inv.greenCoffeeId);
                const shop = orders?.find(o => o.shopId === inv.shopId)?.shop;

                if (!coffee || !shop) return null;

                return (
                  <div key={`${inv.shopId}-${inv.greenCoffeeId}`} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{shop.name}</h3>
                        <p className="text-sm text-muted-foreground">{coffee.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">Small Bags: {inv.smallBags}</p>
                        <p className="text-sm">Large Bags: {inv.largeBags}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!inventory?.length && (
                <p className="text-center text-muted-foreground">No inventory data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders by Shop</CardTitle>
            <CardDescription>Latest orders from each retail location</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {orders?.reduce((shops: any[], order) => {
                if (order.shop && !shops.some(s => s.id === order.shopId)) {
                  shops.push({
                    id: order.shopId,
                    name: order.shop.name,
                    orders: orders.filter(o => o.shopId === order.shopId)
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 3)
                  });
                }
                return shops;
              }, []).map(shop => (
                <div key={shop.id} className="space-y-3">
                  <h3 className="font-medium text-lg">{shop.name}</h3>
                  <div className="space-y-2">
                    {shop.orders.map((order: Order) => {
                      const coffee = coffees?.find(c => c.id === order.greenCoffeeId);
                      return (
                        <div key={order.id} className="p-3 bg-muted rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{coffee?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(order.createdAt), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <Badge variant={order.status === "pending" ? "destructive" : "outline"}>
                              {order.status}
                            </Badge>
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
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Add roaster-specific view
  if (user?.role === "roaster") {
    return (
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.username}</h1>
            <p className="text-muted-foreground">Coffee roasting operations</p>
          </div>
          <Button
            variant="outline"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Pending Orders"
            value={pendingOrders.length}
            icon={Package}
            description="Orders awaiting roasting"
          />
          <StatsCard
            title="Coffee Types"
            value={coffees ? coffees.length : 0}
            icon={Coffee}
          />
          <StatsCard
            title="Low Stock Items"
            value={lowStockCoffees.length}
            icon={AlertTriangle}
          />
        </div>

        {/* Low Stock Alerts */}
        {lowStockCoffees.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-500">Low Stock Alerts</CardTitle>
              <CardDescription>Coffee types below minimum threshold</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockCoffees.map(coffee => (
                  <div key={coffee.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{coffee.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Current stock: {coffee.currentStock}kg
                      </p>
                    </div>
                    <Badge variant="destructive">Below Threshold</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Orders for Roasting */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Orders</CardTitle>
            <CardDescription>Orders awaiting roasting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {pendingOrders.length > 0 ? (
                pendingOrders.map(order => {
                  const coffee = coffees?.find(c => c.id === order.greenCoffeeId);
                  return (
                    <div key={order.id} className="p-3 bg-muted rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{coffee?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            For: {order.shop?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Ordered: {format(new Date(order.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Badge variant="destructive">
                          Pending {getDaysSince(order.createdAt)}d
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="text-sm">Small Bags: {order.smallBags}</div>
                        <div className="text-sm">Large Bags: {order.largeBags}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        asChild
                      >
                        <Link href={`/roasting/orders/${order.id}`}>
                          Start Roasting
                        </Link>
                      </Button>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-muted-foreground">No pending orders</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Green Coffee Inventory */}
        <Card>
          <CardHeader>
            <CardTitle>Green Coffee Inventory</CardTitle>
            <CardDescription>Available green coffee for roasting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {coffees ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coffee</TableHead>
                      <TableHead>Producer</TableHead>
                      <TableHead>Origin</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coffees.map(coffee => (
                      <TableRow key={coffee.id}>
                        <TableCell className="font-medium">{coffee.name}</TableCell>
                        <TableCell>{coffee.producer}</TableCell>
                        <TableCell>{coffee.country}</TableCell>
                        <TableCell className="text-right">{coffee.currentStock}kg</TableCell>
                        <TableCell>
                          {Number(coffee.currentStock) <= Number(coffee.minThreshold) ? (
                            <Badge variant="destructive">Low Stock</Badge>
                          ) : (
                            <Badge variant="outline">In Stock</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground">No coffee inventory available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // For other roles (shop manager, barista), show the regular dashboard
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.username}</h1>
          <p className="text-muted-foreground">Manage your coffee shop inventory</p>
        </div>
        <ShopSelector
          value={selectedShopId}
          onChange={setSelectedShopId}
        />
      </div>

      {/* Basic inventory display */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Inventory</CardTitle>
            <CardDescription>Stock levels for selected shop</CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedShopId ? (
              <p className="text-center text-muted-foreground">Please select a shop</p>
            ) : shopInventory.length === 0 ? (
              <p className="text-center text-muted-foreground">No inventory data available</p>
            ) : (
              <div className="space-y-4">
                {shopInventory.map(item => {
                  const coffee = coffees?.find(c => c.id === item.greenCoffeeId);
                  return (
                    <div key={item.id} className="p-4 border rounded-lg">
                      <h3 className="font-medium">{coffee?.name || 'Unknown Coffee'}</h3>
                      <div className="mt-2 space-y-1">
                        <p>Small Bags: {item.smallBags}</p>
                        <p>Large Bags: {item.largeBags}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shop Details</CardTitle>
            <CardDescription>Selected shop information</CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedShopId ? (
              <p className="text-center text-muted-foreground">Please select a shop</p>
            ) : !shop ? (
              <p className="text-center text-muted-foreground">No shop data available</p>
            ) : (
              <div className="space-y-2">
                <p><strong>Name:</strong> {shop.name}</p>
                <p><strong>Location:</strong> {shop.location}</p>
                <p><strong>Target Small Bags:</strong> {shop.desiredSmallBags}</p>
                <p><strong>Target Large Bags:</strong> {shop.desiredLargeBags}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}