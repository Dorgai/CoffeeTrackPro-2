import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { GreenCoffee, type Order, type OrderStatus } from "@shared/schema";
import { Loader2, Package } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";


const getAvailableStatuses = (currentStatus: string, userRole: string) => {
  // Roasters can only move orders from pending to roasted, and roasted to dispatched
  if (userRole === "roaster") {
    switch (currentStatus) {
      case "pending":
        return [{ value: "roasted", label: "Mark as Roasted" }];
      case "roasted":
        return [{ value: "dispatched", label: "Mark as Dispatched" }];
      default:
        return [];
    }
  }

  // RoasteryOwner and retailOwner can change to any status
  if (["roasteryOwner", "retailOwner"].includes(userRole)) {
    switch (currentStatus) {
      case "pending":
        return [
          { value: "roasted", label: "Mark as Roasted" },
          { value: "dispatched", label: "Mark as Dispatched" },
          { value: "delivered", label: "Mark as Delivered" }
        ];
      case "roasted":
        return [
          { value: "dispatched", label: "Mark as Dispatched" },
          { value: "delivered", label: "Mark as Delivered" }
        ];
      case "dispatched":
        return [{ value: "delivered", label: "Mark as Delivered" }];
      default:
        return [];
    }
  }

  return [];
};

// Helper function to group orders by date
function groupOrdersByDate(orders: OrderWithDetails[]) {
  const groups: Record<string, OrderWithDetails[]> = {};

  orders.forEach(order => {
    const date = new Date(order.createdAt).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(order);
  });

  // Sort orders within each date group by status
  Object.values(groups).forEach(dateOrders => {
    dateOrders.sort((a, b) => {
      const statusOrder = {
        pending: 0,
        roasted: 1,
        dispatched: 2,
        delivered: 3
      };
      return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
    });
  });

  return groups;
}

// Update the OrderWithDetails type to match our SQL query
type OrderWithDetails = {
  id: number;
  shopId: number;
  greenCoffeeId: number;
  smallBags: number;
  largeBags: number;
  status: string;
  createdAt: string;
  createdById: number | null;
  updatedById: number | null;
  shopName: string;
  shopLocation: string;
  coffeeName: string;
  producer: string;
  createdBy: string | null;
  updatedBy: string | null;
};

const updateOrderSchema = z.object({
  smallBags: z.coerce.number().min(0, "Small bags must be 0 or greater"),
  largeBags: z.coerce.number().min(0, "Large bags must be 0 or greater"),
  status: z.enum(["roasted", "dispatched", "delivered"] as const),
});

type UpdateOrderValues = z.infer<typeof updateOrderSchema>;

interface UpdateOrderData {
  smallBags: number;
  largeBags: number;
  status: OrderStatus;
}

export default function RoastingOrders() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  const form = useForm<UpdateOrderValues>({
    resolver: zodResolver(updateOrderSchema),
    defaultValues: {
      smallBags: 0,
      largeBags: 0,
      status: "roasted",
    },
  });

  const { data: orders, isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/orders"],
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, data }: { orderId: number; data: UpdateOrderData }) => {
      const response = await apiRequest("PATCH", `/api/orders/${orderId}/status`, data);
      return response.data;
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

  const handleStatusUpdate = (orderId: number, status: OrderStatus) => {
    updateOrderMutation.mutate({
      orderId,
      data: {
        smallBags: 0, // These will be updated by the backend
        largeBags: 0,
        status,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }


  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Orders</h1>
        <p className="text-muted-foreground">
          Update order status and track fulfillment
        </p>
      </div>

      {Object.entries(groupOrdersByDate(orders || [])).map(([date, dateOrders]) => (
        <Card key={date} className="mb-6">
          <CardHeader>
            <CardTitle>Orders for {date}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {["pending", "roasted", "dispatched", "delivered"].map(status => {
                const statusOrders = dateOrders.filter(order => order.status === status);
                if (statusOrders.length === 0) return null;

                return (
                  <div key={status} className="space-y-4">
                    <h3 className="text-lg font-semibold capitalize">{status}</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Shop</TableHead>
                          <TableHead>Coffee</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created/Updated By</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statusOrders.map(order => (
                          <TableRow key={order.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{order.shopName}</p>
                                <p className="text-sm text-muted-foreground">{order.shopLocation}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p>{order.coffeeName}</p>
                                <p className="text-sm text-muted-foreground">{order.producer}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {order.smallBags > 0 && (
                                  <div>Small Bags (200g): {order.smallBags}</div>
                                )}
                                {order.largeBags > 0 && (
                                  <div>Large Bags (1kg): {order.largeBags}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Badge
                                  variant={order.status === "pending" ? "destructive" : "outline"}
                                  className="capitalize"
                                >
                                  {order.status}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                <div>Ordered by: {order.createdBy || 'Unknown'}</div>
                                {order.updatedBy && (
                                  <div className="text-muted-foreground">
                                    Last updated by: {order.updatedBy}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant={order.status === "pending" ? "default" : "outline"}
                                size="sm"
                                className="w-full"
                                disabled={
                                  // Disable if user can't update this status
                                  !getAvailableStatuses(order.status, user?.role || "").length
                                }
                                onClick={() => {
                                  setSelectedOrder(order);
                                  const availableStatuses = getAvailableStatuses(order.status, user?.role || "");
                                  if (availableStatuses.length > 0) {
                                    form.reset({
                                      smallBags: order.smallBags,
                                      largeBags: order.largeBags,
                                      status: availableStatuses[0].value,
                                    });
                                    setIsUpdateDialogOpen(true);
                                  }
                                }}
                              >
                                Update Status
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

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
                        data: {
                          smallBags: data.smallBags,
                          largeBags: data.largeBags,
                          status: data.status,
                        },
                      });
                    } catch (error) {
                      console.error("Failed to update order:", error);
                    }
                  })}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Status</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            {...field}
                          >
                            {getAvailableStatuses(selectedOrder.status, user?.role || "").map(
                              (status) => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              )
                            )}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={updateOrderMutation.isPending}
                  >
                    {updateOrderMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Update Order"
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