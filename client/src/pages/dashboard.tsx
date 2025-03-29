import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import type { GreenCoffee, RetailInventory, Shop, Order } from "@shared/schema"; 
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { LogOut, Package, Loader2, Store, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { ShopSelector } from "@/components/layout/shop-selector";
import { StockLevelDisplay } from "@/components/coffee/stock-level-display";
import { formatDate } from "@/lib/utils";
import { Link } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
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
    queryKey: ["/api/retail-inventory", selectedShopId],
    enabled: !!selectedShopId,
  });

  const { data: allInventory, isLoading: loadingAllInventory } = useQuery<RetailInventory[]>({
    queryKey: ["/api/retail-inventory"],
    enabled: ["roasteryOwner", "owner", "retailOwner"].includes(user?.role || ""),
  });

  // Update orders query to depend on selectedShopId
  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ["/api/orders", selectedShopId],
    queryFn: async () => {
      const url = selectedShopId
        ? `/api/orders?shopId=${selectedShopId}`
        : "/api/orders";
      const res = await apiRequest("GET", url);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled: !!user && (!!selectedShopId || user.role === "roasteryOwner"),
  });

  const { data: recentBatches, isLoading: loadingBatches } = useQuery({
    queryKey: ["/api/roasting-batches"],
    enabled: user?.role === "roasteryOwner",
  });

  const isLoading = loadingCoffees || loadingAllShops || loadingInventory || loadingAllInventory || loadingOrders || loadingBatches;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Active Shops</CardTitle>
              <CardDescription>Total managed locations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allShops?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Coffee Varieties</CardTitle>
              <CardDescription>Types of coffee available</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{coffees?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        {selectedShopId && (
          <StockLevelDisplay
            inventory={retailInventory || []}
            desiredSmallBags={allShops?.find(s => s.id === selectedShopId)?.desiredSmallBags}
            desiredLargeBags={allShops?.find(s => s.id === selectedShopId)?.desiredLargeBags}
          />
        )}

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
                    <TableCell>{coffee.currentStock}kg</TableCell>
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

        {orders && orders.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest coffee orders and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHead>Coffee</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead>Small Bags</TableHead>
                    <TableHead>Large Bags</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.coffeeName}</TableCell>
                      <TableCell>{order.shopName}</TableCell>
                      <TableCell>{order.smallBags}</TableCell>
                      <TableCell>{order.largeBags}</TableCell>
                      <TableCell>{order.status}</TableCell>
                      <TableCell>{order.created_by || 'Unknown'}</TableCell>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recent Batches</CardTitle>
            <CardDescription>Latest roasting operations</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingBatches ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : recentBatches && recentBatches.length > 0 ? (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Coffee</TableHead>
                    <TableHead>Planned Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bags Produced</TableHead>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentBatches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>{formatDate(batch.roastedAt || batch.createdAt)}</TableCell>
                      <TableCell>{batch.coffeeName}</TableCell>
                      <TableCell>{batch.plannedAmount}kg</TableCell>
                      <TableCell>{batch.status}</TableCell>
                      <TableCell>
                        {batch.smallBagsProduced || 0} × 200g
                        <br />
                        {batch.largeBagsProduced || 0} × 1kg
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No roasting batches found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user?.role === "retailOwner") {
    const shopInventory = allInventory?.filter(inv => inv.shopId === selectedShopId) || [];
    const selectedShop = allShops?.find(shop => shop.id === selectedShopId);

    return (
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.username}</h1>
            <p className="text-muted-foreground">Retail Operations Overview</p>
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

        {!selectedShopId ? (
          <Alert>
            <AlertDescription>
              Please select a shop to view stock levels and manage inventory.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <StockLevelDisplay
              inventory={shopInventory}
              desiredSmallBags={selectedShop?.desiredSmallBags}
              desiredLargeBags={selectedShop?.desiredLargeBags}
            />

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Coffee className="h-5 w-5" />
                  <CardTitle>Coffee Inventory</CardTitle>
                </div>
                <CardDescription>Inventory details by coffee type</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHead>Coffee</TableHead>
                      <TableHead>Producer</TableHead>
                      <TableHead>Small Bags</TableHead>
                      <TableHead>Large Bags</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {shopInventory.map((item) => (
                      <TableRow key={`${item.shopId}-${item.greenCoffeeId}`}>
                        <TableCell>{item.coffeeName}</TableCell>
                        <TableCell>{item.producer}</TableCell>
                        <TableCell>{item.smallBags}</TableCell>
                        <TableCell>{item.largeBags}</TableCell>
                        <TableCell>{item.updatedAt ? formatDate(item.updatedAt) : 'Never'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {orders && orders.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Latest coffee orders and their status</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHead>Coffee</TableHead>
                        <TableHead>Shop</TableHead>
                        <TableHead>Small Bags</TableHead>
                        <TableHead>Large Bags</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>{order.coffeeName}</TableCell>
                          <TableCell>{order.shopName}</TableCell>
                          <TableCell>{order.smallBags}</TableCell>
                          <TableCell>{order.largeBags}</TableCell>
                          <TableCell>{order.status}</TableCell>
                          <TableCell>{order.created_by || 'Unknown'}</TableCell>
                          <TableCell>{formatDate(order.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
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