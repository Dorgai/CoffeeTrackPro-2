import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
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

export default function RetailOrders() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeShop } = useActiveShop();
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);

  // Add update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      console.log("Updating order status for order:", orderId);
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/status`, {
        status: "delivered"
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update order status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Success",
        description: "Order marked as delivered",
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

  const { data: coffees, isLoading: loadingCoffees } = useQuery({
    queryKey: ["/api/green-coffee"],
  });

  const { data: orders, isLoading: loadingOrders } = useQuery({
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
                  {orders.map((order: OrderWithDetails) => {
                    const coffee = coffees?.find(c => c.id === order.greenCoffeeId);
                    const canUpdateToDelivered = user?.role === "retailOwner" && order.status === "dispatched";

                    return (
                      <TableRow key={order.id}>
                        <TableCell>{formatDate(order.createdAt)}</TableCell>
                        <TableCell className="font-medium">{coffee?.name || 'Unknown'}</TableCell>
                        <TableCell>{order.smallBags}</TableCell>
                        <TableCell>{order.largeBags}</TableCell>
                        <TableCell>
                          <Badge variant={order.status === "pending" ? "destructive" : "outline"}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {canUpdateToDelivered && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateOrderMutation.mutate(order.id)}
                              disabled={updateOrderMutation.isPending}
                            >
                              {updateOrderMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Mark as Delivered"
                              )}
                            </Button>
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
            {/* Order form content here */}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}