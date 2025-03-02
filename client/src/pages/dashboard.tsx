import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { GreenCoffee, RetailInventory, Shop } from "@shared/schema";
import { format } from 'date-fns';
import { useEffect, useState } from 'react';

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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { ShopSelector } from "@/components/layout/shop-selector";
import StockProgress from "@/components/stock-progress";
import { RestockDialog } from "@/components/coffee/restock-dialog";
import { apiRequest } from "@/lib/queryClient";

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
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
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);

  // Get available shops for user
  const { data: userShops, isLoading: loadingShops } = useQuery<Shop[]>({
    queryKey: ["/api/user/shops"],
    enabled: !!user && (user.role === "shopManager" || user.role === "barista"),
  });

  // Set default shop
  useEffect(() => {
    if ((user?.role === "shopManager" || user?.role === "barista") && userShops?.length && !selectedShopId) {
      const defaultShop = userShops.find(s => s.id === user.defaultShopId) || userShops[0];
      setSelectedShopId(defaultShop.id);
    }
  }, [user, userShops, selectedShopId]);

  // Get shop details
  const { data: shop, isLoading: loadingShop } = useQuery<Shop>({
    queryKey: ["/api/shops", selectedShopId],
    enabled: !!selectedShopId,
  });

  // Get all coffees
  const { data: coffees, isLoading: loadingCoffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
    enabled: !!user,
  });

  // Get inventory for current shop
  const { data: shopInventory, isLoading: loadingInventory } = useQuery<RetailInventory[]>({
    queryKey: ["/api/retail-inventory", selectedShopId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/retail-inventory?shopId=${selectedShopId}`);
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json();
    },
    enabled: !!selectedShopId && (user?.role === "shopManager" || user?.role === "barista"),
  });

  // Get all inventory for roastery owner and roaster
  const { data: allInventory, isLoading: loadingAllInventory } = useQuery<RetailInventory[]>({
    queryKey: ["/api/retail-inventory"],
    enabled: user?.role === "roasteryOwner" || user?.role === "roaster",
  });

  // Loading states
  const isLoading = loadingShops || loadingShop || loadingCoffees || loadingInventory || loadingAllInventory;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Calculate metrics
  const lowStockCoffees = coffees?.filter(coffee =>
    Number(coffee.currentStock) <= Number(coffee.minThreshold)
  ) || [];

  // Roaster view
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
        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard
            title="Coffee Types"
            value={coffees?.length || 0}
            icon={Coffee}
            description="Available coffee varieties"
          />
          <StatsCard
            title="Low Stock Items"
            value={lowStockCoffees.length}
            icon={AlertTriangle}
            description="Below minimum threshold"
          />
          <StatsCard
            title="Available Stock"
            value={`${coffees?.reduce((total, coffee) => total + Number(coffee.currentStock), 0) || 0}kg`}
            icon={Package}
            description="Total green coffee available"
          />
        </div>

        {/* Green Coffee Inventory */}
        <Card>
          <CardHeader>
            <CardTitle>Green Coffee Inventory</CardTitle>
            <CardDescription>Available coffee for roasting</CardDescription>
          </CardHeader>
          <CardContent>
            {!coffees?.length ? (
              <p className="text-center text-muted-foreground">No coffee inventory available</p>
            ) : (
              <Table>
                <thead>
                  <TableRow>
                    <TableHead>Coffee</TableHead>
                    <TableHead>Producer</TableHead>
                    <TableHead>Origin</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </thead>
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
                      <TableCell>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/roasting/orders/${coffee.id}`}>
                            Start Roasting
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Discrepancy Reports */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Discrepancy Reports</CardTitle>
              <CardDescription>Track inventory discrepancies</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/roasting/discrepancies">
                View All Reports
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Recent Discrepancies Table */}
              <Table>
                <thead>
                  <TableRow>
                    <TableHead>Coffee</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Difference</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </thead>
                <TableBody>
                  {/* We'll fetch this data in the next step */}
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No recent discrepancies found
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

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
      </div>
    );
  }

  // Shop manager and barista view
  if (user?.role === "shopManager" || user?.role === "barista") {
    return (
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.username}</h1>
            <p className="text-muted-foreground">Manage your coffee shop inventory</p>
          </div>
          <div className="flex gap-2">
            <ShopSelector
              value={selectedShopId}
              onChange={setSelectedShopId}
            />
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
        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard
            title="Total Coffee Types"
            value={shopInventory?.length || 0}
            icon={Coffee}
            description="Available varieties"
          />
          <StatsCard
            title="Low Stock Items"
            value={shopInventory?.filter(item =>
              (item.smallBags || 0) < (shop?.desiredSmallBags || 20) / 2 ||
              (item.largeBags || 0) < (shop?.desiredLargeBags || 10) / 2
            ).length || 0}
            icon={AlertTriangle}
            description="Below 50% of target"
          />
          <StatsCard
            title="Stock Health"
            value={`${Math.round((shopInventory?.reduce((acc, item) =>
              acc + ((item.smallBags || 0) >= (shop?.desiredSmallBags || 20) / 2 ? 1 : 0),
              0
            ) / (shopInventory?.length || 1)) * 100)}%`}
            icon={Package}
            description="Items meeting target levels"
          />
        </div>

        {/* Main Content */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Current Inventory */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Current Inventory</CardTitle>
                <CardDescription>Stock levels for selected shop</CardDescription>
              </div>
              {user.role === "shopManager" && <RestockDialog />}
            </CardHeader>
            <CardContent>
              {!selectedShopId ? (
                <p className="text-center text-muted-foreground">Please select a shop</p>
              ) : !shopInventory?.length ? (
                <p className="text-center text-muted-foreground">No inventory data available</p>
              ) : (
                <div className="space-y-4">
                  {shopInventory.map(item => {
                    const coffee = coffees?.find(c => c.id === item.greenCoffeeId);
                    return (
                      <div key={item.id} className="p-4 border rounded-lg">
                        <h3 className="font-medium">{coffee?.name || 'Unknown Coffee'}</h3>
                        <div className="mt-2 space-y-1">
                          <StockProgress
                            current={item.smallBags || 0}
                            desired={shop?.desiredSmallBags || 0}
                            label="Small Bags (200g)"
                          />
                          <StockProgress
                            current={item.largeBags || 0}
                            desired={shop?.desiredLargeBags || 0}
                            label="Large Bags (1kg)"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Items */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Alerts</CardTitle>
              <CardDescription>Items requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedShopId ? (
                <p className="text-center text-muted-foreground">Please select a shop</p>
              ) : (
                <div className="space-y-4">
                  {shopInventory?.filter(item =>
                    (item.smallBags || 0) < (shop?.desiredSmallBags || 20) / 2 ||
                    (item.largeBags || 0) < (shop?.desiredLargeBags || 10) / 2
                  ).map(item => {
                    const coffee = coffees?.find(c => c.id === item.greenCoffeeId);
                    return (
                      <div key={item.id} className="p-3 bg-muted rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{coffee?.name}</p>
                            <div className="text-sm text-muted-foreground">
                              <p>Small Bags: {item.smallBags} / {shop?.desiredSmallBags}</p>
                              <p>Large Bags: {item.largeBags} / {shop?.desiredLargeBags}</p>
                            </div>
                          </div>
                          <Badge variant="destructive">Low Stock</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Shop Details */}
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
    );
  }

  // Roastery owner view
  if (user?.role === "roasteryOwner") {
    return (
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.username}</h1>
            <p className="text-muted-foreground">Coffee roasting operations overview</p>
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
        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard
            title="Active Shops"
            value={allInventory ? new Set(allInventory.map(i => i.shopId)).size : 0}
            icon={Store}
          />
          <StatsCard
            title="Coffee Types"
            value={coffees?.length || 0}
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

        {/* Inventory Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Coffee Inventory Overview</CardTitle>
            <CardDescription>Current stock levels across all shops</CardDescription>
          </CardHeader>
          <CardContent>
            {!allInventory?.length ? (
              <p className="text-center text-muted-foreground">No inventory data available</p>
            ) : (
              <div className="space-y-4">
                {allInventory.map(inv => {
                  const coffee = coffees?.find(c => c.id === inv.greenCoffeeId);
                  if (!coffee) return null;

                  return (
                    <div key={`${inv.shopId}-${inv.greenCoffeeId}`} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{coffee.name}</h3>
                          <p className="text-sm text-muted-foreground">{coffee.producer}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">Small Bags: {inv.smallBags}</p>
                          <p className="text-sm">Large Bags: {inv.largeBags}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}