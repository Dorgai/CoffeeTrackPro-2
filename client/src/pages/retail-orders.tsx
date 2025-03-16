import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { GreenCoffee } from "@shared/schema";
import { Loader2, PackagePlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useActiveShop } from "@/hooks/use-active-shop";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ShopSelector } from "@/components/layout/shop-selector";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { OrderForm } from "@/components/coffee/order-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OrderWithDetails = {
  id: number;
  shopId: number;
  greenCoffeeId: number;
  smallBags: number;
  largeBags: number;
  status: string;
  createdAt: string;
  createdById: number;
  updatedById: number | null;
  shopName: string;
  shopLocation: string;
  coffeeName: string;
  producer: string;
  createdBy: string;
  updatedBy: string | null;
};

const ORDER_STATUS_SEQUENCE = {
  pending: ["roasted"],
  roasted: ["dispatched"],
  dispatched: ["delivered"],
  delivered: [],
};

export default function RetailOrders() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeShop } = useActiveShop();
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      console.log("Updating order status for order:", orderId);
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update order status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/quantities"] });
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Error updating order:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: coffees, isLoading: loadingCoffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
  });

  const { data: orders, isLoading: loadingOrders } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/orders", activeShop?.id],
    queryFn: async () => {
      if (!activeShop?.id) return [];
      const res = await apiRequest("GET", `/api/orders?shopId=${activeShop.id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch orders");
      }
      return res.json();
    },
    enabled: !!activeShop?.id,
  });

  // Helper function to get allowed next statuses
  const getNextStatuses = (currentStatus: string): string[] => {
    if (user?.role === "roasteryOwner") {
      // Roastery owners can set any status except going backwards
      const allStatuses = ["pending", "roasted", "dispatched", "delivered"];
      const currentIndex = allStatuses.indexOf(currentStatus);
      return allStatuses.slice(currentIndex + 1);
    }
    // For retail owners and others, use the sequence map
    return ORDER_STATUS_SEQUENCE[currentStatus] || [];
  };

  if (loadingCoffees || loadingOrders) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order History</h1>
          <p className="text-muted-foreground">
            View and manage your shop's coffee orders
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ShopSelector />
          <Button 
            onClick={() => setIsOrderDialogOpen(true)}
            disabled={!activeShop?.id}
          >
            <PackagePlus className="h-4 w-4 mr-2" />
            Place Order
          </Button>
        </div>
      </div>

      {!activeShop?.id ? (
        <Alert>
          <AlertDescription>
            Please select a shop to view orders and place new orders.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>
              All orders placed by {activeShop.name}
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
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const nextStatuses = getNextStatuses(order.status);
                    return (
                      <TableRow key={order.id}>
                        <TableCell>{formatDate(order.createdAt)}</TableCell>
                        <TableCell className="font-medium">{order.coffeeName}</TableCell>
                        <TableCell>{order.smallBags}</TableCell>
                        <TableCell>{order.largeBags}</TableCell>
                        <TableCell>
                          <Badge variant={order.status === "pending" ? "destructive" : "outline"}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(user?.role === "retailOwner" || user?.role === "roasteryOwner") && (
                            <>
                              {user?.role === "retailOwner" ? (
                                order.status === "dispatched" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updateOrderMutation.mutate({
                                        orderId: order.id,
                                        status: "delivered",
                                      })
                                    }
                                    disabled={updateOrderMutation.isPending}
                                  >
                                    {updateOrderMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      "Mark as Delivered"
                                    )}
                                  </Button>
                                )
                              ) : (
                                nextStatuses.length > 0 && (
                                  <Select
                                    defaultValue={order.status}
                                    onValueChange={(value) =>
                                      updateOrderMutation.mutate({
                                        orderId: order.id,
                                        status: value,
                                      })
                                    }
                                    disabled={updateOrderMutation.isPending}
                                  >
                                    <SelectTrigger className="w-[130px]">
                                      <SelectValue placeholder="Change status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {nextStatuses.map((status) => (
                                        <SelectItem key={status} value={status}>
                                          {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )
                              )}
                            </>
                          )}
                        </TableCell>
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
      )}

      <Dialog
        open={isOrderDialogOpen}
        onOpenChange={setIsOrderDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place New Order</DialogTitle>
            <DialogDescription>Order coffee from the roastery</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {coffees?.map((coffee) => (
              <div key={coffee.id} className="mb-4">
                <OrderForm
                  coffee={coffee}
                  availableBags={{ smallBags: 0, largeBags: 0 }}
                  onSuccess={() => {
                    setIsOrderDialogOpen(false);
                    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
                  }}
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}