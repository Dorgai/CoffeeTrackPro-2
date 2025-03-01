import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Coffee,
  Package,
  Store,
  BarChart3,
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
import type { GreenCoffee, RoastingBatch, RetailInventory } from "@shared/schema";

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

// Helper function to calculate day difference
function isSameDay(date1: Date, date2: Date) {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
}

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();

  const { data: coffees, isLoading: loadingCoffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
    enabled: !!user && user.role === "roasteryOwner",
  });

  const { data: batches, isLoading: loadingBatches } = useQuery<RoastingBatch[]>({
    queryKey: ["/api/roasting-batches"],
    enabled: !!user && (user.role === "roaster" || user.role === "roasteryOwner"),
  });

  // Get current and previous day inventory
  const { data: currentInventory, isLoading: loadingInventory } = useQuery<RetailInventory[]>({
    queryKey: ["/api/retail-inventory", user?.defaultShopId],
    enabled: !!user,
  });

  const { data: previousInventory } = useQuery<RetailInventory[]>({
    queryKey: ["/api/retail-inventory/history", user?.defaultShopId],
    enabled: !!user,
  });

  if (loadingCoffees || loadingBatches || loadingInventory) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.username}</h1>
          <p className="text-muted-foreground">Here's what's happening with your coffee roasting operations.</p>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Green Coffee Types"
          value={coffees?.length || 0}
          icon={Coffee}
        />
        <StatsCard
          title="Roasting Batches"
          value={batches?.length || 0}
          icon={Package}
          description="Total batches"
        />
        <StatsCard
          title="Low Stock Items"
          value={lowStockCoffees.length}
          icon={AlertTriangle}
        />
        <StatsCard
          title="Active Shops"
          value={currentInventory?.length || 0}
          icon={Store}
        />
      </div>

      {lowStockCoffees.length > 0 && (
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Recent Roasting Batches</CardTitle>
            {user?.role === "roaster" && (
              <Button variant="outline" asChild>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Stock Overview</CardTitle>
            {(user?.role === "shopManager" || user?.role === "barista") && (
              <Button variant="outline" asChild>
                <Link href="/retail">Manage Stock</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inventoryWithChanges?.slice(0, 5).map(inv => (
                <div key={inv.id} className="space-y-2 p-3 bg-muted rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{inv.shop?.name || `Shop #${inv.shopId}`}</p>
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
              ))}
              {(!inventoryWithChanges || inventoryWithChanges.length === 0) && (
                <p className="text-muted-foreground text-center py-4">No inventory data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Green Coffee Inventory Section */}
      {user?.role === "roasteryOwner" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Green Coffee Inventory</CardTitle>
            <Button variant="outline" asChild>
              <Link href="/inventory">View All</Link>
            </Button>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {coffees?.map((coffee) => (
                  <TableRow key={coffee.id}>
                    <TableCell className="font-medium">
                      <Link href={`/coffee/${coffee.id}`} className="hover:underline">
                        {coffee.name}
                      </Link>
                    </TableCell>
                    <TableCell>{coffee.producer || '-'}</TableCell>
                    <TableCell>{coffee.country || '-'}</TableCell>
                    <TableCell>{coffee.currentStock} kg</TableCell>
                    <TableCell>{coffee.minThreshold} kg</TableCell>
                    <TableCell>
                      {Number(coffee.currentStock) <= Number(coffee.minThreshold) ? (
                        <Badge variant="destructive">Low Stock</Badge>
                      ) : (
                        <Badge variant="outline">In Stock</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(!coffees || coffees.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                      No green coffee inventory available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}