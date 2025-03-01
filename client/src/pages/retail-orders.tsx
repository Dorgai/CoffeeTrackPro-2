import { useQuery } from "@tanstack/react-query";
import { GreenCoffee } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useActiveShop } from "@/hooks/use-active-shop";
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
import { apiRequest } from "@/lib/queryClient";

type OrderWithUser = {
  id: number;
  shopId: number;
  greenCoffeeId: number;
  smallBags: number;
  largeBags: number;
  status: string;
  createdAt: string;
  createdById: number;
  user: {
    id: number;
    username: string;
    role: string;
  };
};

export default function RetailOrders() {
  const { user } = useAuth();
  const { activeShop } = useActiveShop();

  const { data: coffees, isLoading: loadingCoffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
  });

  const { data: orders, isLoading: loadingOrders } = useQuery<OrderWithUser[]>({
    queryKey: ["/api/orders", activeShop?.id],
    queryFn: async () => {
      if (!activeShop?.id) return [];
      const res = await apiRequest("GET", `/api/orders?shopId=${activeShop.id}`);
      return res.json();
    },
    enabled: !!activeShop?.id,
  });

  if (!activeShop?.id) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
          Please select a shop from the dropdown in the navigation bar.
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