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
  LogOut 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();

  const { data: coffees, isLoading: loadingCoffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
  });

  const { data: batches, isLoading: loadingBatches } = useQuery<RoastingBatch[]>({
    queryKey: ["/api/roasting-batches"],
  });

  const { data: inventory, isLoading: loadingInventory } = useQuery<RetailInventory[]>({
    queryKey: ["/api/retail-inventory", user?.shopId],
    enabled: user?.shopId !== undefined,
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
          description="Last 30 days"
        />
        <StatsCard
          title="Low Stock Items"
          value={lowStockCoffees.length}
          icon={AlertTriangle}
        />
        <StatsCard
          title="Active Shops"
          value={inventory?.length || 0}
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
                      Current stock: {coffee.currentStock.toString()}kg
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
                    {new Date(batch.roastedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p>{batch.roastedAmount.toString()}kg roasted</p>
                  <p className="text-sm text-muted-foreground">
                    Loss: {batch.roastingLoss.toString()}kg
                  </p>
                </div>
              </div>
            ))}
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
              {inventory?.slice(0, 5).map(inv => (
                <div key={inv.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Shop #{inv.shopId}</p>
                    <p className="text-sm text-muted-foreground">
                      Last updated: {new Date(inv.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>{inv.smallBags} small bags</p>
                    <p>{inv.largeBags} large bags</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}