import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { apiRequest } from "@/lib/queryClient";
import type { GreenCoffee, RoastingBatch, RetailInventory } from "@shared/schema";
import { useState } from "react";
import { ShopSelector } from "@/components/layout/shop-selector";
import { format } from 'date-fns';
import StockProgress from "@/components/stock-progress"; //Presumed import


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
    desiredSmallBags?: number; // Added desiredSmallBags
    desiredLargeBags?: number; // Added desiredLargeBags
  };
  greenCoffee: {
    name: string;
    producer: string;
  };
};

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

// Function to calculate days since a date
function getDaysSince(date: string) {
  const orderDate = new Date(date);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - orderDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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

export function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [selectedShopId, setSelectedShopId] = useState<number | null>(user?.defaultShopId || null);

  // Get all available coffees
  const { data: coffees, isLoading: loadingCoffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/green-coffee");
      if (!res.ok) {
        throw new Error("Failed to fetch coffees");
      }
      return res.json();
    },
    enabled: !!user,
  });

  // Get roasting batches for roasters and owners
  const { data: batches, isLoading: loadingBatches } = useQuery<RoastingBatch[]>({
    queryKey: ["/api/roasting-batches"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/roasting-batches");
      if (!res.ok) {
        throw new Error("Failed to fetch batches");
      }
      return res.json();
    },
    enabled: !!user && (user.role === "roaster" || user.role === "roasteryOwner"),
  });

  // Get current inventory for all shops  
  const { data: currentInventory, isLoading: loadingInventory } = useQuery<RetailInventory[]>({
    queryKey: ["/api/retail-inventory", selectedShopId],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/retail-inventory" + (selectedShopId ? `?shopId=${selectedShopId}` : ''));
      if (!res.ok) {
        throw new Error("Failed to fetch inventory");
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

  // Get all orders
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


  if (loadingCoffees || loadingBatches || loadingInventory || loadingOrders) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Filter data by selected shop for baristas
  const getFilteredData = (data: any[]) => {
    if (user?.role === "barista" && selectedShopId) {
      return data?.filter(item => item.shopId === selectedShopId);
    }
    return data;
  };

  const filteredOrders = getFilteredData(orders || []);
  const filteredInventory = getFilteredData(currentInventory || []);


  // Get pending orders grouped by shop (for managers)
  const pendingOrdersByShop = orders ?
    groupOrdersByShop(orders.filter(order => order.status === "pending")) : {};

  const lowStockCoffees = coffees?.filter(
    coffee => Number(coffee.currentStock) <= Number(coffee.minThreshold)
  ) || [];

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

  // Update the shops rendering logic to be more defensive
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

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.username}</h1>
          <p className="text-muted-foreground">Here's what's happening with your coffee roasting operations.</p>
        </div>
        <div className="flex gap-2">
          {user?.role === "barista" && (
            <ShopSelector
              value={selectedShopId}
              onChange={setSelectedShopId}
            />
          )}
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

      {/* Stats cards section - Update counts based on filtered data */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Last Order"
          value={lastOrderDate && lastOrderDate.getTime() > 0 ? format(lastOrderDate, 'MMM d, yyyy') : 'No orders'}
          icon={Package}
        />
        <StatsCard
          title="Pending Orders"
          value={pendingOrders.length}
          description={oldestPendingOrder > 0 ? `Oldest: ${oldestPendingOrder} days ago` : undefined}
          icon={AlertTriangle}
        />
        {user?.role !== "roaster" && (
          <StatsCard
            title="Active Shops"
            value={new Set(filteredOrders.map(o => o.shopId)).size}
            icon={Store}
          />
        )}
        <StatsCard
          title="Coffee Types"
          value={coffees ? `${coffees.filter(c => Number(c.currentStock) > 0).length} / ${coffees.length}` : '0 / 0'}
          icon={Coffee}
          description="In Stock / Total Available"
        />
      </div>

      {/* Missing Coffee Types Widget - Not visible for roasters */}
      {user?.role !== "roaster" && (
        <Card>
          <CardHeader>
            <CardTitle>Missing Coffee Types</CardTitle>
            <CardDescription>Coffee types available in other shops but not in stock here</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {getShopsToShow().map(shop => {
                if (!shop) return null;

                const shopInventory = currentInventory?.filter(inv => inv.shopId === shop.id) || [];
                const shopCoffeeIds = new Set(shopInventory.map(inv => inv.greenCoffeeId));

                // Find coffees that exist in other shops but not in this one
                const missingCoffees = coffees?.filter(coffee => {
                  if (!coffee) return false;
                  const isInOtherShops = currentInventory?.some(inv =>
                    inv.shopId !== shop.id &&
                    inv.greenCoffeeId === coffee.id &&
                    (inv.smallBags > 0 || inv.largeBags > 0)
                  );
                  return !shopCoffeeIds.has(coffee.id) && isInOtherShops;
                }) || [];

                if (!missingCoffees.length) return null;

                return (
                  <div key={shop.id} className="space-y-2">
                    <h3 className="font-medium">{shop.name}</h3>
                    <div className="grid gap-2">
                      {missingCoffees.map(coffee => (
                        <div key={coffee.id} className="p-3 bg-muted rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{coffee.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {coffee.producer} - {coffee.country}
                              </p>
                            </div>
                            {(user?.role === "shopManager" || user?.role === "barista") && (
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/retail/orders?coffeeId=${coffee.id}&shopId=${shop.id}`}>
                                  Order Now
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {!currentInventory?.length && (
                <p className="text-center text-muted-foreground py-4">No inventory data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manager's View - Total Stock Overview and Shop Breakdown */}
      {user?.role === "shopManager" && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Stock Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Global Stock Overview</CardTitle>
              <CardDescription>Combined inventory across all locations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orders?.filter(order => order.shop && order.shop.desiredSmallBags !== undefined && order.shop.desiredLargeBags !== undefined).reduce((shops, order) => { //Added condition to check for desired values.
                  if (order.shop && !shops.some(s => s.id === order.shopId)) {
                    shops.push({ id: order.shopId, name: order.shop.name, desiredSmallBags: order.shop.desiredSmallBags, desiredLargeBags: order.shop.desiredLargeBags });
                  }
                  return shops;
                }, [] as Array<{ id: number; name: string; desiredSmallBags: number; desiredLargeBags: number;}>).map(shop => { // Added desiredSmallBags and desiredLargeBags
                  const shopInventory = currentInventory?.filter(inv => inv.shopId === shop.id) || [];

                  const totalSmallBags = shopInventory.reduce((sum, inv) => sum + inv.smallBags, 0);
                  const totalLargeBags = shopInventory.reduce((sum, inv) => sum + inv.largeBags, 0);

                  return (
                    <div key={shop.id} className="space-y-4 pb-4 border-b last:border-0">
                      <h3 className="font-medium text-lg">{shop.name}</h3>
                      <StockProgress
                        current={totalSmallBags}
                        desired={shop.desiredSmallBags}
                        label="Small Bags"
                      />
                      <StockProgress
                        current={totalLargeBags}
                        desired={shop.desiredLargeBags}
                        label="Large Bags"
                      />
                    </div>
                  );
                })}
                {!currentInventory?.length && (
                  <p className="text-center text-muted-foreground py-4">No inventory data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pending Orders */}
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
        </div>
      )}

      {/* Low stock alerts section for Roastery Owners and Roasters */}
      {(user?.role === "roasteryOwner" || user?.role === "roaster") && lowStockCoffees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Low Stock Alerts</CardTitle>
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
      <div className="grid gap-4 md:grid-cols-2">
        {/* Stock Overview Section - Only for shop managers and baristas */}
        {(user?.role === "shopManager" || user?.role === "barista") && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Stock Overview</CardTitle>
              <Button variant="outline" asChild>
                <Link href="/retail">Manage Stock</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredInventory?.slice(0, 5).map(inv => {
                  const coffee = coffees?.find(c => c.id === inv.greenCoffeeId);
                  return (
                    <div key={inv.id} className="space-y-2 p-3 bg-muted rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{coffee?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Last updated: {new Date(inv.updatedAt || "").toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <span>Small Bags:</span>
                          <div className="flex items-center gap-2">
                            <span>{inv.smallBags}</span>
                            {inv.smallBagChange !== 0 && (
                              <span className={`text-sm ${inv.smallBagChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {inv.smallBagChange > 0 ? (
                                  <TrendingUp className="h-4 w-4" />
                                ) : (
                                  <TrendingDown className="h-4 w-4" />
                                )}
                                {Math.abs(inv.smallBagChange)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Large Bags:</span>
                          <div className="flex items-center gap-2">
                            <span>{inv.largeBags}</span>
                            {inv.largeBagChange !== 0 && (
                              <span className={`text-sm ${inv.largeBagChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {inv.largeBagChange > 0 ? (
                                  <TrendingUp className="h-4 w-4" />
                                ) : (
                                  <TrendingDown className="h-4 w-4" />
                                )}
                                {Math.abs(inv.largeBagChange)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(!filteredInventory || filteredInventory.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">No inventory data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pending Orders Section - For both roasters and managers */}
      {(user?.role === "roaster" || user?.role === "shopManager") && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Pending Orders</CardTitle>
            <Button variant="outline" asChild>
              <Link href={user?.role === "roaster" ? "/roasting/orders" : "/retail/orders"}>
                View All Orders
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {user?.role === "shopManager" ? (
                // For managers: Show orders grouped by shop
                Object.entries(pendingOrdersByShop).map(([shopName, shopOrders]) => (
                  <div key={shopName} className="space-y-3">
                    <h3 className="font-medium text-sm text-muted-foreground">{shopName}</h3>
                    <div className="space-y-2">
                      {shopOrders.map(order => (
                        <div key={order.id} className="p-3 bg-muted rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium">{order.greenCoffee?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Ordered: {new Date(order.createdAt).toLocaleDateString()} ({getDaysSince(order.createdAt)} days ago)
                              </p>
                            </div>
                            <Badge variant="destructive">Pending {getDaysSince(order.createdAt)}d</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                            <div>Small Bags: {order.smallBags}</div>
                            <div>Large Bags: {order.largeBags}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                // For roasters: Show all pending orders
                <div className="space-y-4">
                  {orders?.filter(order => order.status === "pending").map(order => (
                    <div key={order.id} className="space-y-2 p-3 bg-muted rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{order.shop?.name}</p>
                          <p className="text-sm">{order.greenCoffee?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Ordered: {new Date(order.createdAt).toLocaleDateString()} ({getDaysSince(order.createdAt)} days ago)
                          </p>
                        </div>
                        <Badge variant="destructive">Pending {getDaysSince(order.createdAt)}d</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>Small Bags: {order.smallBags}</div>
                        <div>Large Bags: {order.largeBags}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {(!orders || orders.filter(order => order.status === "pending").length === 0) && (
                <p className="text-muted-foreground text-center py-4">No pending orders</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Retail Inventory Overview - For roasteryOwner */}
      {user?.role === "roasteryOwner" && (
        <Card>
          <CardHeader>
            <CardTitle>Retail Inventory Overview</CardTitle>
            <CardDescription>Current stock levels across all shops</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {orders?.filter(order => order.shop).reduce((shops, order) => {
                if (order.shop && !shops.some(s => s.id === order.shopId)) {
                  shops.push({ id: order.shopId, name: order.shop.name });
                }
                return shops;
              }, [] as Array<{ id: number; name: string }>).map(shop => {
                const shopInventory = currentInventory?.filter(inv => inv.shopId === shop.id) || [];

                return (
                  <div key={shop.id} className="space-y-4">
                    <h3 className="font-semibold text-lg">{shop.name}</h3>
                    <div className="space-y-2">
                      {shopInventory.map(inv => {
                        const coffee = coffees?.find(c => c.id === inv.greenCoffeeId);
                        const isLowStock = inv.smallBags < 3 || inv.largeBags < 3;

                        return (
                          <div
                            key={`${inv.shopId}-${inv.greenCoffeeId}`}
                            className={`p-3 rounded-lg ${isLowStock ? 'bg-destructive/10' : 'bg-muted'}`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{coffee?.name}</p>
                                <div className="text-sm text-muted-foreground">
                                  <p>Small Bags: {inv.smallBags}</p>
                                  <p>Large Bags: {inv.largeBags}</p>
                                </div>
                              </div>
                              {isLowStock && (
                                <Badge variant="destructive">Low Stock</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {shopInventory.length === 0 && (
                        <p className="text-muted-foreground text-center py-2">No inventory data</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders by Shop - For roasteryOwner */}
      {user?.role === "roasteryOwner" && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders by Shop</CardTitle>
            <CardDescription>Latest orders from each retail location</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {orders?.filter(order => order.shop).reduce((shops, order) => {
                if (order.shop && !shops.some(s => s.id === order.shopId)) {
                  shops.push({ id: order.shopId, name: order.shop.name, location: order.shop.location });
                }
                return shops;
              }, [] as Array<{ id: number; name: string; location: string }>).map(shop => {
                const shopOrders = orders?.filter(order => order.shopId === shop.id) || [];

                return (
                  <div key={shop.id} className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-lg">{shop.name}</h3>
                      <Badge variant="outline">{shop.location}</Badge>
                    </div>
                    <div className="space-y-2">
                      {shopOrders.slice(0, 3).map(order => {
                        const coffee = coffees?.find(c => c.id === order.greenCoffeeId);

                        return (
                          <div key={order.id} className="p-3 bg-muted rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{coffee?.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Ordered: {new Date(order.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge
                                variant={order.status === "pending" ? "destructive" : "outline"}
                                className="capitalize"
                              >
                                {order.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                              <div>Small Bags: {order.smallBags}</div>
                              <div>Large Bags: {order.largeBags}</div>
                            </div>
                          </div>
                        );
                      })}
                      {shopOrders.length === 0 && (
                        <p className="text-muted-foreground text-center py-2">No recent orders</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Green Coffee Inventory Section - Show for both roasteryOwner and roaster */}
      {(user?.role === "roasteryOwner" || user?.role === "roaster") && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Green Coffee Inventory</CardTitle>
            {user?.role === "roasteryOwner" && (
              <Button variant="outline" asChild>
                <Link href="/inventory">View All</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coffee</TableHead>
                  <TableHead>Producer</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Min. Threshold</TableHead>
                  <TableHead>Status</TableHead>
                  {user?.role === "roasteryOwner" && <TableHead>Details</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {coffees?.map((coffee) => (
                  <TableRow key={coffee.id}>
                    <TableCell className="font-medium">{coffee.name}</TableCell>
                    <TableCell>{coffee.producer || '-'}</TableCell>
                    <TableCell>{coffee.country || '-'}</TableCell>
                    <TableCell>{coffee.currentStock} kg</TableCell>
                    <TableCell>{coffee.minThreshold || 0} kg</TableCell>
                    <TableCell>
                      {Number(coffee.currentStock) <= Number(coffee.minThreshold) ? (
                        <Badge variant="destructive">Low Stock</Badge>
                      ) : (
                        <Badge variant="outline">In Stock</Badge>
                      )}
                    </TableCell>
                    {user?.role === "roasteryOwner" && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link href={`/inventory/${coffee.id}`}>
                            <Button variant="outline" size="sm">View Details</Button>
                          </Link>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {(!coffees || coffees.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                      No green coffee inventory available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {/* Recent Roasting Batches section - For roaster and roasteryOwner */}
      {(user?.role === "roaster" || user?.role === "roasteryOwner") && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Recent Roasting Batches</CardTitle>
            {user?.role === "roaster" && (
              <Button variant="outlineasChild>
                <Link href="/roasting">View All</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {batches?.slice(0, 5).map(batch => (
              <div key={batch.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Batch #{batch.id}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(batch.roastedAt || "").toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p>{batch.roastedAmount}kg roasted</p>
                  <p className="text-sm text-muted-foreground">
                    Loss: {batch.roastingLoss}kg
                  </p>
                </div>
              </div>
            ))}
            {(!batches || batches.length === 0) && (
              <p className="text-muted-foreground text-center py-4">No roasting batches recorded yet</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default Dashboard;