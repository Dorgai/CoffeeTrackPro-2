import { useQuery } from "@tanstack/react-query";
import { GreenCoffee, Order } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export default function RetailOrders() {
  const { user } = useAuth();

  const { data: coffees, isLoading: loadingCoffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
  });

  const { data: orders, isLoading: loadingOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders", user?.shopId],
    enabled: !!user?.shopId,
  });

  if (!user?.shopId) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
          You are not assigned to any shop. Please contact an administrator.
        </div>
      </div>
    );
  }

  if (loadingCoffees || loadingOrders) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Order History</h1>
        <p className="text-muted-foreground">
          View and manage your shop's coffee orders
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>
            All orders placed by your shop
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders && orders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Coffee</TableHead>
                  <TableHead>Small Bags (200g)</TableHead>
                  <TableHead>Large Bags (1kg)</TableHead>
                  <TableHead>Total Weight</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ordered By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const coffee = coffees?.find(c => c.id === order.greenCoffeeId);
                  const totalWeight = (order.smallBags * 0.2) + (order.largeBags * 1);

                  return (
                    <TableRow key={order.id}>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                      <TableCell className="font-medium">{coffee?.name || 'Unknown'}</TableCell>
                      <TableCell>{order.smallBags}</TableCell>
                      <TableCell>{order.largeBags}</TableCell>
                      <TableCell>{totalWeight.toFixed(2)} kg</TableCell>
                      <TableCell className="capitalize">{order.status}</TableCell>
                      <TableCell>{order.user?.username || '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No orders have been placed yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
