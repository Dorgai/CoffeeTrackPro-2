import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { GreenCoffee, RetailInventory, Shop } from "@shared/schema";
import { format } from 'date-fns';
import { useEffect, useState } from 'react';

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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShopSelector } from "@/components/layout/shop-selector";
import StockProgress from "@/components/stock-progress";
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
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);

  // Get available shops for user
  const { data: userShops } = useQuery<Shop[]>({
    queryKey: ["/api/user/shops"],
    enabled: !!user && (user.role === "shopManager" || user.role === "barista"),
  });

  // Automatically select default shop
  useEffect(() => {
    if (user?.role === "shopManager" || user?.role === "barista") {
      if (userShops && userShops.length > 0 && !selectedShopId) {
        const defaultShop = userShops.find(s => s.id === user.defaultShopId) || userShops[0];
        setSelectedShopId(defaultShop.id);
      }
    }
  }, [user, userShops, selectedShopId]);

  // Get shop details
  const { data: shop, isLoading: loadingShop } = useQuery<Shop>({
    queryKey: ["/api/shops", selectedShopId],
    enabled: !!selectedShopId,
  });

  // Get inventory
  const { data: inventory, isLoading: loadingInventory } = useQuery<RetailInventory[]>({
    queryKey: ["/api/retail-inventory"],
    enabled: !!user,
  });

  // Get coffee data
  const { data: coffees, isLoading: loadingCoffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
    enabled: !!user,
  });

  // Loading state
  if (loadingShop || loadingInventory || loadingCoffees) {
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

  // Calculate metrics for roastery owner view
  const lowStockCoffees = coffees?.filter(coffee =>
    Number(coffee.currentStock) <= Number(coffee.minThreshold)
  ) || [];

  // Common header section
  const Header = () => (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.username}</h1>
        <p className="text-muted-foreground">
          {user?.role === "roasteryOwner" && "Coffee roasting operations overview"}
          {user?.role === "roaster" && "Coffee roasting operations"}
          {(user?.role === "shopManager" || user?.role === "barista") && "Manage your coffee shop inventory"}
        </p>
      </div>
      <div className="flex gap-2">
        {(user?.role === "shopManager" || user?.role === "barista") && (
          <ShopSelector
            value={selectedShopId}
            onChange={setSelectedShopId}
          />
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
  );

  // Shop manager and barista view
  if (user?.role === "shopManager" || user?.role === "barista") {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <Header />

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Current Inventory</CardTitle>
              <CardDescription>Stock levels for selected shop</CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedShopId ? (
                <p className="text-center text-muted-foreground">Please select a shop</p>
              ) : !shopInventory.length ? (
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

  // Roaster view
  if (user?.role === "roaster") {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <Header />

        <div className="grid gap-4 md:grid-cols-3">
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
                <TableHeader>
                  <TableRow>
                    <TableHead>Coffee</TableHead>
                    <TableHead>Producer</TableHead>
                    <TableHead>Origin</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
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
        <Header />

        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard
            title="Active Shops"
            value={inventory ? new Set(inventory.map(i => i.shopId)).size : 0}
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

        <Card>
          <CardHeader>
            <CardTitle>Coffee Inventory Overview</CardTitle>
            <CardDescription>Current stock levels across all shops</CardDescription>
          </CardHeader>
          <CardContent>
            {!inventory?.length ? (
              <p className="text-center text-muted-foreground">No inventory data available</p>
            ) : (
              <div className="space-y-4">
                {inventory.map(inv => {
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