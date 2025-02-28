import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRetailInventorySchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { GreenCoffee, RetailInventory, Order } from "@shared/schema";
import { Loader2, Plus } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export default function Retail() {
  const { user } = useAuth();
  const { toast } = useToast();
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

  const updateInventoryMutation = useMutation({
    mutationFn: async (data: {
      greenCoffeeId: number;
      smallBags: number;
      largeBags: number;
    }) => {
      const res = await apiRequest("POST", "/api/retail-inventory", {
        ...data,
        shopId: user?.shopId,
        updatedById: user?.id,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/retail-inventory", user?.shopId],
      });
      toast({
        title: "Success",
        description: "Inventory updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
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

  const handleUpdateInventory = (coffeeId: number, smallBags: number, largeBags: number) => {
    updateInventoryMutation.mutate({
      greenCoffeeId: coffeeId,
      smallBags,
      largeBags,
    });
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
            <CardDescription>Stock levels for your shop</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coffee</TableHead>
                  <TableHead>Small Bags (200g)</TableHead>
                  <TableHead>Large Bags (1kg)</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coffees?.map((coffee) => {
                  const inv = inventory?.find(
                    (i) => i.greenCoffeeId === coffee.id
                  ) || { smallBags: 0, largeBags: 0 };
                  return (
                    <TableRow key={coffee.id}>
                      <TableCell>{coffee.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            className="w-20"
                            defaultValue={inv.smallBags}
                            onChange={(e) =>
                              handleUpdateInventory(
                                coffee.id,
                                parseInt(e.target.value) || 0,
                                inv.largeBags
                              )
                            }
                          />
                          <span>bags</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            className="w-20"
                            defaultValue={inv.largeBags}
                            onChange={(e) =>
                              handleUpdateInventory(
                                coffee.id,
                                inv.smallBags,
                                parseInt(e.target.value) || 0
                              )
                            }
                          />
                          <span>bags</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCoffee(coffee)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Order More
                        </Button>
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
            <Card>
              <CardHeader>
                <CardTitle>Place Order</CardTitle>
                <CardDescription>
                  Order more {selectedCoffee.name} for your shop
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Your existing OrderForm component */}
                <OrderForm
                  greenCoffeeId={selectedCoffee.id}
                  maxSmallBags={100}
                  maxLargeBags={50}
                  onSuccess={() => setSelectedCoffee(null)}
                />
              </CardContent>
            </Card>
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