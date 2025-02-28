import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { OrderForm } from "@/components/coffee/order-form";
import type { GreenCoffee, RetailInventory, Order } from "@shared/schema";
import { Loader2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Retail() {
  const { user } = useAuth();
  const [selectedCoffee, setSelectedCoffee] = useState<GreenCoffee | null>(null);

  const { data: coffees, isLoading: loadingCoffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
  });

  const { data: inventory, isLoading: loadingInventory } = useQuery<
    RetailInventory[]
  >({
    queryKey: ["/api/retail-inventory", user?.shopId],
    enabled: user?.shopId !== undefined,
  });

  const { data: orders, isLoading: loadingOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders", user?.shopId],
    enabled: user?.shopId !== undefined,
  });

  if (loadingCoffees || loadingInventory || loadingOrders) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const getOrderStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "warning";
      case "approved":
        return "success";
      case "completed":
        return "secondary";
      case "rejected":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Retail Management</h1>
        <p className="text-muted-foreground">
          Manage your shop's inventory and place orders.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Current Inventory</CardTitle>
            <CardDescription>
              Stock levels for your shop
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coffee</TableHead>
                  <TableHead>Small Bags</TableHead>
                  <TableHead>Large Bags</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory?.map((inv) => {
                  const coffee = coffees?.find(
                    (c) => c.id === inv.greenCoffeeId
                  );
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>{coffee?.name}</TableCell>
                      <TableCell>{inv.smallBags}</TableCell>
                      <TableCell>{inv.largeBags}</TableCell>
                      <TableCell>
                        <Badge
                          className="cursor-pointer"
                          onClick={() => setSelectedCoffee(coffee || null)}
                        >
                          Order More
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-8">
          {selectedCoffee && (
            <OrderForm
              greenCoffeeId={selectedCoffee.id}
              maxSmallBags={100}
              maxLargeBags={50}
              onSuccess={() => setSelectedCoffee(null)}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Coffee</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders?.map((order) => {
                    const coffee = coffees?.find(
                      (c) => c.id === order.greenCoffeeId
                    );
                    return (
                      <TableRow key={order.id}>
                        <TableCell>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{coffee?.name}</TableCell>
                        <TableCell>
                          {order.smallBags} × 200g
                          <br />
                          {order.largeBags} × 1kg
                        </TableCell>
                        <TableCell>
                          <Badge variant={getOrderStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
