import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { GreenCoffee } from "@shared/schema";
import { Loader2, PackagePlus } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { OrderForm } from "@/components/coffee/order-form";
import { ShopSelector } from "@/components/layout/shop-selector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

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

const updateOrderSchema = z.object({
  status: z.enum(["delivered"] as const),
});

type UpdateOrderValues = z.infer<typeof updateOrderSchema>;

export default function RetailOrders() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeShop } = useActiveShop();
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  const form = useForm<UpdateOrderValues>({
    resolver: zodResolver(updateOrderSchema),
    defaultValues: {
      status: "delivered",
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
      return res.json();
    },
    enabled: !!activeShop?.id,
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (data: UpdateOrderValues & { orderId: number }) => {
      const res = await apiRequest("PATCH", `/api/orders/${data.orderId}/status`, {
        status: data.status,
        updatedById: user?.id,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setIsUpdateDialogOpen(false);
      setSelectedOrder(null);
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update order",
        variant: "destructive",
      });
    },
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
                  {orders.map((order) => {
                    const coffee = coffees?.find(c => c.id === order.greenCoffeeId);
                    const canUpdateToDelivered = order.status === "dispatched" && user?.role === "retailOwner";

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
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsUpdateDialogOpen(true);
                              }}
                            >
                              Mark as Delivered
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Place New Order</DialogTitle>
            <DialogDescription>Order coffee from the roastery</DialogDescription>
          </DialogHeader>
          <CardContent>
            {coffees?.map((coffee) => (
              <div key={coffee.id} className="mb-4">
                <OrderForm
                  coffee={coffee}
                  availableBags={{ smallBags: 0, largeBags: 0 }}
                  onSuccess={() => setIsOrderDialogOpen(false)}
                />
              </div>
            ))}
          </CardContent>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isUpdateDialogOpen}
        onOpenChange={(open) => {
          setIsUpdateDialogOpen(open);
          if (!open) setSelectedOrder(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              {selectedOrder && (
                <>
                  Order #{selectedOrder.id} - {selectedOrder.coffeeName}
                  <br />
                  Current Status: <Badge>{selectedOrder.status}</Badge>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="py-4">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(async (data) => {
                    if (!selectedOrder) return;
                    try {
                      await updateOrderMutation.mutateAsync({
                        orderId: selectedOrder.id,
                        ...data,
                      });
                    } catch (error) {
                      console.error("Failed to update order:", error);
                    }
                  })}
                  className="space-y-4"
                >
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={updateOrderMutation.isPending}
                  >
                    {updateOrderMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Mark as Delivered"
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
