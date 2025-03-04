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

  const { data: coffees, isLoading: loadingCoffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
    enabled: !!user,
  });

  const { data: allOrders, isLoading: loadingAllOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user && (user.role === "roasteryOwner" || user?.role === "roaster"),
  });

  if (loadingCoffees || loadingAllOrders) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const lowStockCoffees = coffees?.filter(coffee =>
    Number(coffee.currentStock) <= Number(coffee.minThreshold)
  ) || [];

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
                  <TableHead>Green Coffee Used</TableHead>
                  <TableHead>Roasted Amount</TableHead>
                  <TableHead>Bags Produced</TableHead>
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
                        <TableCell>{order.greenCoffeeAmount} kg</TableCell>
                        <TableCell>{order.roastedAmount} kg</TableCell>
                        <TableCell>
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
      </div>
    );
  }

  // Return null for other roles as their views are handled elsewhere
  return null;
}