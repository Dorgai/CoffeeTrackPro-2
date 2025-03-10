import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import type { GreenCoffee, RetailInventory, Shop, Order } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { RestockDialog } from "@/components/coffee/restock-dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { LogOut, Package, Loader2, Store, AlertTriangle, Coffee, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { ShopSelector } from "@/components/layout/shop-selector";
import StockProgress from "@/components/stock-progress";
import { formatDate } from "@/lib/utils";
import { Link } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [activeShopId, setActiveShopId] = useState<number | null>(null);
  const [, navigate] = useLocation();

  const { data: coffees, isLoading: loadingCoffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
    enabled: !!user,
  });

  const { data: allShops, isLoading: loadingAllShops } = useQuery<Shop[]>({
    queryKey: ["/api/shops"],
    enabled: !!user && (user.role === "roasteryOwner" || user.role === "owner"),
  });

  const { data: retailInventory, isLoading: loadingInventory } = useQuery({
    queryKey: ["/api/retail-inventory", activeShopId],
    queryFn: async () => {
      if (!activeShopId) return [];
      console.log("Fetching retail inventory for shop:", activeShopId);
      const res = await fetch(`/api/retail-inventory?shopId=${activeShopId}`);
      if (!res.ok) throw new Error('Failed to fetch inventory');
      const data = await res.json();
      console.log("Received inventory data:", data);
      return data;
    },
    enabled: !!activeShopId,
  });

  const { data: allInventory, isLoading: loadingAllInventory } = useQuery<RetailInventory[]>({
    queryKey: ["/api/retail-inventory"],
    enabled: ["roasteryOwner", "owner", "retailOwner"].includes(user?.role || ""),
  });

  const { data: allOrders, isLoading: loadingAllOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user && ["roasteryOwner", "roaster", "owner", "retailOwner"].includes(user.role),
  });

  const { data: shopOrders, isLoading: loadingShopOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders", activeShopId],
    enabled: !!activeShopId && (user?.role === "shopManager" || user?.role === "barista"),
  });

  const { data: roastingHistory, isLoading: loadingRoastingHistory } = useQuery({
    queryKey: ["/api/roasting-batches"],
    queryFn: async () => {
      console.log("Fetching roasting history, user role:", user?.role);
      const res = await fetch("/api/roasting-batches");
      if (!res.ok) throw new Error('Failed to fetch roasting history');
      const data = await res.json();
      console.log("Received roasting history:", data);
      return data;
    },
    enabled: !!user && ["roasteryOwner", "roaster"].includes(user.role),
  });

  const isLoading = loadingCoffees || loadingAllShops || loadingInventory ||
    loadingAllInventory || loadingAllOrders || loadingShopOrders || loadingRoastingHistory;

  const handleRestock = (shopId: number) => {
    setActiveShopId(shopId);
    setIsRestockOpen(true);
  };

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

  if (user?.role === "roasteryOwner") {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.username}</h1>
            <p className="text-muted-foreground">Coffee roasting operations overview</p>
          </div>
          <div className="flex gap-2">
            <ShopSelector
              value={activeShopId}
              onChange={setActiveShopId}
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
            title="Order Fulfillment"
            value={`${allOrders?.length ? Math.round((allOrders?.filter(o => o.status === 'delivered').length / allOrders?.length) * 100) : 0}%`}
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

        <RestockDialog
          open={isRestockOpen}
          onOpenChange={(open) => {
            setIsRestockOpen(open);
            if (!open) {
              setActiveShopId(null);
            }
          }}
          shopId={activeShopId}
        />

        <Card>
          <CardHeader>
            <CardTitle>Green Coffee Inventory</CardTitle>
            <CardDescription>Current stock levels and details</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Producer</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHead>
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
            <CardTitle>Shop Performance</CardTitle>
            <CardDescription>Overall performance data</CardDescription>
          </CardHeader>
          <CardContent>
            {!allShops?.length ? (
              <div className="text-center text-muted-foreground py-8">
                No shops available
              </div>
            ) : (
              <div className="space-y-8">
                {allShops.map(shop => {
                  const shopInventory = allInventory?.filter(inv => inv.shopId === shop.id) || [];
                  const totalItems = shopInventory.length;
                  const healthyItems = shopInventory.filter(item =>
                    (item.smallBags || 0) >= (shop.desiredSmallBags || 20) / 2 &&
                    (item.largeBags || 0) >= (shop.desiredLargeBags || 10) / 2
                  ).length;

                  return (
                    <div key={shop.id}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium">{shop.name}</h3>
                          <p className="text-sm text-muted-foreground">{shop.location}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={healthyItems < totalItems ? "destructive" : "outline"}>
                            {healthyItems < totalItems ? `${totalItems - healthyItems} Low Stock` : "Stock OK"}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestock(shop.id)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Restock
                          </Button>
                        </div>
                      </div>

                      <StockProgress
                        current={healthyItems}
                        desired={totalItems}
                        label="Overall Stock Health"
                      />

                      <div className="mt-4 space-y-4">
                        {shopInventory.map(inv => {
                          const coffee = coffees?.find(c => c.id === inv.greenCoffeeId);
                          if (!coffee) return null;

                          return (
                            <div key={`${shop.id}-${inv.greenCoffeeId}`} className="p-4 bg-muted rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <div className="font-medium">{coffee.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    Producer: {coffee.producer}
                                  </div>
                                </div>
                              </div>
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
              </div>
            )}
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
                  <TableHead>Shop</TableHead>
                  <TableHead>Coffee</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHead>
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
      </div>
    );
  }

  if (user?.role === "retailOwner") {
    const shopInventory = allInventory?.filter(inv => inv.shopId === activeShopId) || [];
    const selectedShop = allShops?.find(shop => shop.id === activeShopId);

    return (
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.username}</h1>
            <p className="text-muted-foreground">Retail Operations Overview</p>
          </div>
          <div className="flex gap-2">
            <ShopSelector
              value={activeShopId}
              onChange={setActiveShopId}
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

        {!activeShopId ? (
          <Alert>
            <AlertDescription>
              Please select a shop to view performance data and manage inventory.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <StatsCard
                title="Shop Status"
                value={selectedShop?.isActive ? "Active" : "Inactive"}
                icon={Store}
                description={selectedShop?.location || "Location"}
              />
              <StatsCard
                title="Order Fulfillment"
                value={`${allOrders?.length ? Math.round((allOrders?.filter(o => o.status === 'delivered' && o.shopId === activeShopId).length / allOrders?.filter(o => o.shopId === activeShopId).length) * 100) : 0}%`}
                icon={Package}
                onClick={() => navigate("/retail/orders")}
                description="Manage Orders"
              />
              <StatsCard
                title="Low Stock Items"
                value={shopInventory.filter(item =>
                  (item.smallBags || 0) < (selectedShop?.desiredSmallBags || 20) / 2 ||
                  (item.largeBags || 0) < (selectedShop?.desiredLargeBags || 10) / 2
                ).length}
                icon={AlertTriangle}
                onClick={() => handleRestock(activeShopId)}
                description="View Restock Options"
              />
            </div>

            <RestockDialog
              open={isRestockOpen}
              onOpenChange={(open) => {
                setIsRestockOpen(open);
                if (!open) setActiveShopId(null);
              }}
              shopId={activeShopId}
            />

            <Card>
              <CardHeader>
                <CardTitle>Shop Performance</CardTitle>
                <CardDescription>Inventory and stock levels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium">{selectedShop?.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedShop?.location}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestock(activeShopId)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Restock
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {shopInventory.map(inv => {
                      const coffee = coffees?.find(c => c.id === inv.greenCoffeeId);
                      if (!coffee) return null;

                      return (
                        <div key={`${activeShopId}-${inv.greenCoffeeId}`} className="p-4 bg-muted rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-medium">{coffee.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Producer: {coffee.producer}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <StockProgress
                              current={inv.smallBags || 0}
                              desired={selectedShop?.desiredSmallBags || 20}
                              label="Small Bags (200g)"
                            />
                            <StockProgress
                              current={inv.largeBags || 0}
                              desired={selectedShop?.desiredLargeBags || 10}
                              label="Large Bags (1kg)"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest orders for {selectedShop?.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHead>Coffee</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allOrders
                      ?.filter(order => order.shopId === activeShopId)
                      .slice(0, 5)
                      .map(order => {
                        const coffee = coffees?.find(c => c.id === order.greenCoffeeId);
                        return (
                          <TableRow key={order.id}>
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
                    {(!allOrders?.length || !allOrders.filter(order => order.shopId === activeShopId).length) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No recent orders found
                        </TableCell>
                      </TableRow>
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
          </>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Welcome</h1>
        <p className="text-muted-foreground">Please log in to continue</p>
      </div>
    </div>
  );
}

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