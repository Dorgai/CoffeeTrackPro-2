import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import type { GreenCoffee, RetailInventory, Shop, Order } from "@shared/schema";
import { format } from 'date-fns';
import { useState } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShopSelector } from "@/components/layout/shop-selector";
import StockProgress from "@/components/stock-progress";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";

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

  // Get user's shops
  const { data: userShops } = useQuery<Shop[]>({
    queryKey: ["/api/user/shops"],
    enabled: !!user && (user.role === "shopManager" || user.role === "barista"),
  });

  // Get all shops for roasteryOwner
  const { data: allShops } = useQuery<Shop[]>({
    queryKey: ["/api/shops"],
    enabled: !!user && user.role === "roasteryOwner",
  });

  // Get selected shop details
  const { data: shop, isLoading: loadingShop } = useQuery<Shop>({
    queryKey: ["/api/shops", selectedShopId],
    enabled: !!selectedShopId,
  });

  // Fetch retail inventory based on role and selected shop
  const { data: shopInventory, isLoading: loadingInventory } = useQuery<RetailInventory[]>({
    queryKey: ["/api/retail-inventory", selectedShopId],
    enabled: !!selectedShopId,
  });

  // Fetch all retail inventory for roasteryOwner
  const { data: allInventory } = useQuery<RetailInventory[]>({
    queryKey: ["/api/retail-inventory"],
    enabled: user?.role === "roasteryOwner",
  });

  // Fetch coffee data for all users
  const { data: coffees, isLoading: loadingCoffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
    enabled: !!user,
  });

  // Fetch all orders for roasteryOwner and roaster
  const { data: allOrders, isLoading: loadingAllOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user && (user.role === "roasteryOwner" || user.role === "roaster"),
  });

  // Fetch orders based on role and selected shop
  const { data: shopOrders, isLoading: loadingShopOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders", selectedShopId],
    enabled: !!selectedShopId,
  });

  const isLoading = loadingShop || loadingInventory || loadingCoffees || loadingAllOrders || loadingShopOrders;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (user?.role === "roaster") {
    const lowStockCoffees = coffees?.filter(coffee =>
      Number(coffee.currentStock) <= Number(coffee.minThreshold)
    ) || [];

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

        {/* Recent Roasting Batches section */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Roasting Batches</CardTitle>
            <CardDescription>Latest roasting activities</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Coffee</TableHead>
                  <TableHead>Small Bags</TableHead>
                  <TableHead>Large Bags</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
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
                        <TableCell>{formatDate(order.createdAt)}</TableCell>
                        <TableCell>{coffee?.name}</TableCell>
                        <TableCell>{order.smallBags}</TableCell>
                        <TableCell>{order.largeBags}</TableCell>
                        <TableCell>
                          <Badge variant={
                            order.status === 'pending' ? 'outline' :
                            order.status === 'roasted' ? 'secondary' :
                            order.status === 'dispatched' ? 'default' :
                            'default'
                          }>
                            {order.status}
                          </Badge>
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

        {/* Recent Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest order status and activities</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coffee</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
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
                        <TableCell>{coffee?.name}</TableCell>
                        <TableCell>
                          {order.smallBags > 0 && `${order.smallBags} small`}
                          {order.smallBags > 0 && order.largeBags > 0 && ', '}
                          {order.largeBags > 0 && `${order.largeBags} large`}
                        </TableCell>
                        <TableCell>{order.createdById}</TableCell>
                        <TableCell>
                          <Badge variant={
                            order.status === 'pending' ? 'outline' :
                            order.status === 'roasted' ? 'secondary' :
                            order.status === 'dispatched' ? 'default' :
                            order.status === 'delivered' ? 'default' : 'outline'
                          }>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(order.createdAt)}</TableCell>
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
            value={allShops?.length || 0}
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
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Producer</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coffees?.map(coffee => (
                  <TableRow key={coffee.id}>
                    <TableCell className="font-medium">{coffee.name}</TableCell>
                    <TableCell>{coffee.producer}</TableCell>
                    <TableCell>{coffee.country}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{coffee.currentStock}kg</div>
                        <StockProgress
                          current={Number(coffee.currentStock)}
                          desired={Number(coffee.minThreshold) * 2}
                          label="Stock Level"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {Number(coffee.currentStock) <= Number(coffee.minThreshold) ? (
                        <Badge variant="destructive">Low Stock</Badge>
                      ) : (
                        <Badge variant="outline">In Stock</Badge>
                      )}
                    </TableCell>
                    <TableCell>
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
              <TableHeader>
                <TableRow>
                  <TableHead>Shop</TableHead>
                  <TableHead>Coffee</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allOrders?.slice(0, 5).map(order => {
                  const coffee = coffees?.find(c => c.id === order.greenCoffeeId);
                  const orderShop = allShops?.find(s => s.id === order.shopId);
                  return (
                    <TableRow key={order.id}>
                      <TableCell>{orderShop?.name}</TableCell>
                      <TableCell>{coffee?.name}</TableCell>
                      <TableCell>
                        {order.smallBags > 0 && `${order.smallBags} small`}
                        {order.smallBags > 0 && order.largeBags > 0 && ', '}
                        {order.largeBags > 0 && `${order.largeBags} large`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          order.status === 'pending' ? 'outline' :
                          order.status === 'roasted' ? 'secondary' :
                          order.status === 'dispatched' ? 'default' :
                          'default'
                        }>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
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
            {allShops?.map(shop => {
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
      </div>
    );
  }

  return null;
}