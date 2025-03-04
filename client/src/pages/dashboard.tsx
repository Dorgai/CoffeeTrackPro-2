import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import type { GreenCoffee, RetailInventory, Shop, Order } from "@shared/schema";
import { format as formatDate } from 'date-fns';
import { useEffect, useState } from 'react';
import { RestockDialog } from "@/components/coffee/restock-dialog";

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
import { apiRequest } from "@/lib/queryClient";

function StatsCard({
  title,
  value,
  icon: Icon,
  onClick,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  onClick?: () => void;
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
          <button
            onClick={onClick}
            className={`text-xs ${onClick ? 'text-primary hover:underline cursor-pointer' : 'text-muted-foreground'} mt-1`}
          >
            {description}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [, navigate] = useLocation();

  const { data: userShops, isLoading: loadingShops } = useQuery<Shop[]>({
    queryKey: ["/api/user/shops"],
    enabled: !!user && (user.role === "shopManager" || user.role === "barista"),
  });

  useEffect(() => {
    if ((user?.role === "shopManager" || user?.role === "barista") && userShops?.length && !selectedShopId) {
      const defaultShop = userShops.find(s => s.id === user.defaultShopId) || userShops[0];
      setSelectedShopId(defaultShop.id);
    }
  }, [user, userShops, selectedShopId]);

  const { data: shop, isLoading: loadingShop } = useQuery<Shop>({
    queryKey: ["/api/shops", selectedShopId],
    enabled: !!selectedShopId,
  });

  const { data: coffees, isLoading: loadingCoffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
    enabled: !!user,
  });

  const { data: shopInventory, isLoading: loadingInventory } = useQuery<RetailInventory[]>({
    queryKey: ["/api/retail-inventory", selectedShopId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/retail-inventory?shopId=${selectedShopId}`);
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json();
    },
    enabled: !!selectedShopId && (user?.role === "shopManager" || user?.role === "barista"),
  });

  const { data: allInventory, isLoading: loadingAllInventory } = useQuery<RetailInventory[]>({
    queryKey: ["/api/retail-inventory"],
    enabled: user?.role === "roasteryOwner" || user?.role === "roaster",
  });

  const { data: orders, isLoading: loadingOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: user?.role === "roasteryOwner",
  });

  const { data: roasteryOwnerShops, isLoading: loadingRoasteryOwnerShops } = useQuery<Shop[]>({
    queryKey: ["/api/shops"],
    enabled: user?.role === "roasteryOwner",
  });

  const { data: allOrders, isLoading: loadingAllOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user && (user.role === "roasteryOwner" || user?.role === "roaster"),
  });

  const { data: shopOrders, isLoading: loadingShopOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders", selectedShopId],
    queryFn: async () => {
      if (!selectedShopId) return [];
      const res = await apiRequest("GET", `/api/orders?shopId=${selectedShopId}`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled: !!selectedShopId && (user?.role === "shopManager" || user?.role === "barista"),
  });

  const { data: discrepancies, isLoading: loadingDiscrepancies } = useQuery({
    queryKey: ["/api/inventory-discrepancies"],
    enabled: !!user && (user.role === "roaster" || user.role === "roasteryOwner"),
    queryFn: async () => {
      console.log("Fetching discrepancies for role:", user?.role);
      const res = await apiRequest("GET", "/api/inventory-discrepancies");
      if (!res.ok) {
        throw new Error("Failed to fetch discrepancies");
      }
      return res.json();
    }
  });

  const isLoading = loadingShops || loadingShop || loadingCoffees || loadingInventory ||
    loadingAllInventory || loadingOrders || loadingRoasteryOwnerShops ||
    loadingAllOrders || loadingShopOrders || loadingDiscrepancies;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const lowStockCoffees = coffees?.filter(coffee =>
    Number(coffee.currentStock) <= Number(coffee.minThreshold)
  ) || [];

  const InventoryDiscrepancyView = () => {
    console.log("Rendering InventoryDiscrepancyView with discrepancies:", discrepancies);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory Discrepancies</CardTitle>
          <CardDescription>Recent inventory adjustments</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingDiscrepancies ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !discrepancies?.length ? (
            <p className="text-center text-muted-foreground">No recent discrepancies found</p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Coffee</TableHead>
                  <TableHead className="text-right">Small Bags</TableHead>
                  <TableHead className="text-right">Large Bags</TableHead>
                </TableRow>
              </TableHead>
              <TableBody>
                {discrepancies.map((discrepancy: any) => {
                  console.log("Processing discrepancy:", discrepancy);
                  return (
                    <TableRow key={discrepancy.id}>
                      <TableCell>{formatDate(new Date(discrepancy.createdAt), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{discrepancy.confirmation?.shop?.name}</p>
                          <p className="text-sm text-muted-foreground">{discrepancy.confirmation?.shop?.location}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{discrepancy.confirmation?.greenCoffee?.name}</p>
                          <p className="text-sm text-muted-foreground">{discrepancy.confirmation?.greenCoffee?.producer}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1">
                          <p>Expected: {discrepancy.confirmation?.dispatchedSmallBags}</p>
                          <p>Received: {discrepancy.confirmation?.receivedSmallBags}</p>
                          <p className={discrepancy.smallBagsDifference < 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
                            Difference: {discrepancy.smallBagsDifference}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1">
                          <p>Expected: {discrepancy.confirmation?.dispatchedLargeBags}</p>
                          <p>Received: {discrepancy.confirmation?.receivedLargeBags}</p>
                          <p className={discrepancy.largeBagsDifference < 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
                            Difference: {discrepancy.largeBagsDifference}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    );
  };


  if (user?.role === "roaster") {
    return (
      <div className="container mx-auto py-8 space-y-8">
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
            description="Items Below Threshold"
          />
          <StatsCard
            title="Available Stock"
            value={`${coffees?.reduce((total, coffee) => total + Number(coffee.currentStock), 0) || 0}kg`}
            icon={Package}
            onClick={() => navigate("/inventory")}
            description="View Inventory"
          />
        </div>

        {/* Green Coffee Inventory section */}
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
                <TableHead>
                  <TableRow>
                    <TableHead className="text-left">Name</TableHead>
                    <TableHead className="text-left">Producer</TableHead>
                    <TableHead className="text-left">Origin</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-left">Status</TableHead>
                    
                  </TableRow>
                </TableHead>
                <TableBody>
                  {coffees.map(coffee => (
                    <TableRow key={coffee.id}>
                      <TableCell className="text-left font-medium">{coffee.name}</TableCell>
                      <TableCell className="text-left">{coffee.producer}</TableCell>
                      <TableCell className="text-left">{coffee.country}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-medium">{coffee.currentStock}kg</span>
                         
                        </div>
                      </TableCell>
                      <TableCell className="text-left">
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

        {/* Recent Roasting Batches section */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Roasting Batches</CardTitle>
            <CardDescription>Latest roasting activities</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHead className="text-left">Date</TableHead>
                  <TableHead className="text-left">Coffee</TableHead>
                  <TableHead className="text-right">Green Coffee Used</TableHead>
                  <TableHead className="text-right">Roasted Amount</TableHead>
                  <TableHead className="text-left">Bags Produced</TableHead>
                </TableRow>
              </TableHead>
              <TableBody>
                {!allOrders?.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No recent batches found
                    </TableCell>
                  </TableRow>
                ) : (
                  allOrders.slice(0, 5).map(order => {
                    const coffee = coffees?.find(c => c.id === order.greenCoffeeId);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="text-left">{formatDate(new Date(order.createdAt), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-left">{coffee?.name}</TableCell>
                        <TableCell className="text-right">{order.greenCoffeeAmount} kg</TableCell>
                        <TableCell className="text-right">{order.roastedAmount} kg</TableCell>
                        <TableCell className="text-left">
                          {order.smallBags > 0 && `${order.smallBags} small`}
                          {order.smallBags > 0 && order.largeBags > 0 && ', '}
                          {order.largeBags > 0 && `${order.largeBags} large`}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <div className="mt-4 flex justify-end">
              <Button asChild variant="outline" size="sm">
                <Link href="/roasting/orders">View All Batches</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <InventoryDiscrepancyView />
      </div>
    );
  }
  if (user?.role === "shopManager" || user?.role === "barista") {
    const totalItems = shopInventory?.length || 0;
    const lowStockItems = shopInventory?.filter(item =>
      (item.smallBags || 0) < (shop?.desiredSmallBags || 20) / 2 ||
      (item.largeBags || 0) < (shop?.desiredLargeBags || 10) / 2
    ).length || 0;
    const stockHealth = totalItems ? Math.round(((totalItems - lowStockItems) / totalItems) * 100) : 0;

    return (
      <div className="container mx-auto py-8 space-y-8">
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

        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard
            title="Total Coffee Types"
            value={totalItems}
            icon={Coffee}
            description="Available varieties"
          />
          <StatsCard
            title="Low Stock Items"
            value={lowStockItems}
            icon={AlertTriangle}
            onClick={() => setIsRestockOpen(true)}
            description="View Restock Options"
          />
          <StatsCard
            title="Stock Health"
            value={`${stockHealth}%`}
            icon={Package}
            description="Items meeting target levels"
          />
        </div>

        <RestockDialog open={isRestockOpen} onOpenChange={setIsRestockOpen} />

        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>Key metrics for selected shop</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <StockProgress
              current={totalItems - lowStockItems}
              desired={totalItems}
              label="Overall Stock Health"
            />
            <StockProgress
              current={shopInventory?.reduce((sum, item) => sum + (item.smallBags || 0), 0) || 0}
              desired={shop?.desiredSmallBags || 0}
              label="Total Small Bags"
            />
            <StockProgress
              current={shopInventory?.reduce((sum, item) => sum + (item.largeBags || 0), 0) || 0}
              desired={shop?.desiredLargeBags || 0}
              label="Total Large Bags"
            />
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Current Inventory</CardTitle>
                <CardDescription>Stock levels for selected shop</CardDescription>
              </div>
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
                        <div className="mt-2 space-y-2">
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

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest order status and activities</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHead className="text-left">Coffee</TableHead>
                  <TableHead className="text-left">Amount</TableHead>
                  <TableHead className="text-left">Created By</TableHead>
                  <TableHead className="text-left">Status</TableHead>
                  <TableHead className="text-left">Date</TableHead>
                </TableRow>
              </TableHead>
              <TableBody>
                {!shopOrders?.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No recent orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  shopOrders.slice(0, 5).map(order => {
                    const coffee = coffees?.find(c => c.id === order.greenCoffeeId);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="text-left">{coffee?.name}</TableCell>
                        <TableCell className="text-left">
                          {order.smallBags > 0 && `${order.smallBags} small`}
                          {order.smallBags > 0 && order.largeBags > 0 && ', '}
                          {order.largeBags > 0 && `${order.largeBags} large`}
                        </TableCell>
                        <TableCell className="text-left">{order.createdById}</TableCell>
                        <TableCell className="text-left">
                          <Badge variant={
                            order.status === 'pending' ? 'outline' :
                            order.status === 'roasted' ? 'secondary' :
                            order.status === 'dispatched' ? 'default' :
                            order.status === 'delivered' ? 'default' : 'outline'
                          }>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-left">
                          {formatDate(new Date(order.createdAt || ''), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <div className="mt-4 flex justify-end">
              <Button asChild variant="outline" size="sm">
                <Link href="/retail/orders">View All Orders</Link>
              </Button>
            </div>
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
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{shop.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{shop.location}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <StockProgress
                    current={shopInventory?.reduce((sum, item) => sum + (item.smallBags || 0), 0) || 0}
                    desired={shop.desiredSmallBags || 0}
                    label="Total Small Bags (200g)"
                  />
                  <StockProgress
                    current={shopInventory?.reduce((sum, item) => sum + (item.largeBags || 0), 0) || 0}
                    desired={shop.desiredLargeBags || 0}
                    label="Total Large Bags (1kg)"
                  />
                </div>
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">Target Stock Levels</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Target Small Bags</p>
                      <p className="font-medium">{shop.desiredSmallBags}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Target Large Bags</p>
                      <p className="font-medium">{shop.desiredLargeBags}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
  if (user?.role === "roasteryOwner") {
    const totalOrders = allOrders?.length || 0;
    const completedOrders = allOrders?.filter(o => o.status === 'delivered').length || 0;
    const orderFulfillmentRate = totalOrders ? Math.round((completedOrders / totalOrders) * 100) : 0;

    return (
      <div className="container mx-auto py-8 space-y-8">
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

        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard
            title="Order Fulfillment"
            value={`${orderFulfillmentRate}%`}
            icon={Package}
            onClick={() => navigate("/roasting/orders")}
            description="Manage Orders"
          />
          <StatsCard
            title="Active Shops"
            value={roasteryOwnerShops?.length || 0}
            icon={Store}
            description="Total managed locations"
          />
          <StatsCard
            title="Low Stock Items"
            value={lowStockCoffees.length}
            icon={AlertTriangle}
            onClick={() => setIsRestockOpen(true)}
            description="View Restock Options"
          />
        </div>

        <RestockDialog open={isRestockOpen} onOpenChange={setIsRestockOpen} />

        <Card>
          <CardHeader>
            <CardTitle>Green Coffee Inventory</CardTitle>
            <CardDescription>Current stock levels and details</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHead className="text-left">Name</TableHead>
                  <TableHead className="text-left">Producer</TableHead>
                  <TableHead className="text-left">Country</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-left">Status</TableHead>
                  <TableHead className="text-left">Actions</TableHead>
                </TableRow>
              </TableHead>
              <TableBody>
                {coffees?.map(coffee => (
                  <TableRow key={coffee.id}>
                    <TableCell className="text-left font-medium">{coffee.name}</TableCell>
                    <TableCell className="text-left">{coffee.producer}</TableCell>
                    <TableCell className="text-left">{coffee.country}</TableCell>
                    <TableCell className="text-right">
                      <div>
                        <div className="font-medium">{coffee.currentStock}kg</div>
                        <StockProgress
                          current={Number(coffee.currentStock)}
                          desired={Number(coffee.minThreshold) * 2}
                          label="Stock Level"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-left">
                      {Number(coffee.currentStock) <= Number(coffee.minThreshold) ? (
                        <Badge variant="destructive">Low Stock</Badge>
                      ) : (
                        <Badge variant="outline">In Stock</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-left">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/coffee/${coffee.id}`)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders Overview</CardTitle>
            <CardDescription>Recent order status and activities</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHead className="text-left">Shop</TableHead>
                  <TableHead className="text-left">Coffee</TableHead>
                  <TableHead className="text-left">Amount</TableHead>
                  <TableHead className="text-left">Status</TableHead>
                  <TableHead className="text-left">Date</TableHead>
                </TableRow>
              </TableHead>
              <TableBody>
                {allOrders?.slice(0, 5).map(order => {
                  const coffee = coffees?.find(c => c.id === order.greenCoffeeId);
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="text-left">{order.shop?.name}</TableCell>
                      <TableCell className="text-left">{coffee?.name}</TableCell>
                      <TableCell className="text-left">
                        {order.smallBags > 0 && `${order.smallBags} small`}
                        {order.smallBags > 0 && order.largeBags > 0 && ', '}
                        {order.largeBags > 0 && `${order.largeBags} large`}
                      </TableCell>
                      <TableCell className="text-left">
                        <Badge variant={
                          order.status === 'pending' ? 'outline' :
                          order.status === 'roasted' ? 'secondary' :
                          order.status === 'dispatched' ? 'default' :
                          'success'
                        }>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-left">{formatDate(new Date(order.createdAt), 'MMM d, yyyy')}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="mt-4 flex justify-end">
              <Button asChild variant="outline" size="sm">
                <Link href="/roasting/orders">View All Orders</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shops Performance</CardTitle>
            <CardDescription>Stock levels and order status across shops</CardDescription>
          </CardHeader>
          <CardContent>
            {roasteryOwnerShops?.map(shop => {
              const shopInventory = allInventory?.filter(inv => inv.shopId === shop.id) || [];
              const totalItems = shopInventory.length;
              const healthyItems = shopInventory.filter(item =>
                (item.smallBags || 0) >= (shop.desiredSmallBags || 20) / 2 &&
                (item.largeBags || 0) >= (shop.desiredLargeBags || 10) / 2
              ).length;

              return (
                <div key={shop.id} className="mb-6 last:mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{shop.name}</h3>
                    <Badge variant={healthyItems < totalItems ? "destructive" : "outline"}>
                      {healthyItems < totalItems ? `${totalItems - healthyItems} Low Stock` : "Stock OK"}
                    </Badge>
                  </div>
                  <StockProgress
                    current={healthyItems}
                    desired={totalItems}
                    label="Stock Health"
                  />
                  <div className="mt-4 space-y-2">
                    {shopInventory.map(inv => {
                      const coffee = coffees?.find(c => c.id === inv.greenCoffeeId);
                      return (
                        <div key={`${shop.id}-${inv.greenCoffeeId}`} className="p-2 bg-muted rounded">
                          <div className="text-sm font-medium mb-2">{coffee?.name}</div>
                          <div className="space-y-2">
                            <StockProgress
                              current={inv.smallBags || 0}
                              desired={shop.desiredSmallBags || 20}
                              label="Small Bags (200g)"
                            />
                            <StockProgress
                              current={inv.largeBags || 0}
                              desired={shop.desiredLargeBags || 10}
                              label="Large Bags (1kg)"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="mt-4 flex justify-end">
              <Button asChild variant="outline" size="sm">
                <Link href="/shops">Manage Shops</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Latest updates and changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allOrders?.slice(0, 5).map(order => {
                const shop = order.shop;
                const coffee = coffees?.find(c => c.id === order.greenCoffeeId);
                const updatedBy = order.updatedBy;

                return (
                  <div key={order.id} className="flex items-start space-x-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">
                        {shop?.name} - {coffee?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Status changed to {order.status}
                        {updatedBy && ` by ${updatedBy.username}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(new Date(order.updatedAt || order.createdAt), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

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
  return null;
}