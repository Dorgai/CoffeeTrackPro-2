import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { GreenCoffee } from "@shared/schema";
import { Loader2, Package } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type OrderWithDetails = {
  id: number;
  shopId: number;
  greenCoffeeId: number;
  smallBags: number;
  largeBags: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  shop: {
    name: string;
    location: string;
  };
  greenCoffee: {
    name: string;
    producer: string;
  };
  user: {
    username: string;
  };
  updatedBy?: {
    username: string;
  };
};

const updateOrderSchema = z.object({
  smallBags: z.coerce.number().min(0),
  largeBags: z.coerce.number().min(0),
  status: z.enum(["roasted", "dispatched", "delivered"]),
});

type UpdateOrderValues = z.infer<typeof updateOrderSchema>;

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
    mutationFn: async (data: UpdateOrderValues & { orderId: number }) => {
      const res = await apiRequest("PATCH", `/api/orders/${data.orderId}/status`, {
        status: data.status,
        smallBags: data.smallBags,
        largeBags: data.largeBags,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Group orders by shop
  const ordersByShop = orders?.reduce((acc, order) => {
    const shopId = order.shopId;
    if (!acc[shopId]) {
      acc[shopId] = {
        shop: order.shop,
        orders: []
      };
    }
    acc[shopId].orders.push(order);
    return acc;
  }, {} as Record<number, { shop: OrderWithDetails['shop'], orders: OrderWithDetails[] }>);

  const getAvailableStatuses = () => {
    if (user?.role === "roaster") {
      return [
        { value: "roasted", label: "Roasted" },
        { value: "dispatched", label: "Dispatched" },
      ];
    }
    return [
      { value: "roasted", label: "Roasted" },
      { value: "dispatched", label: "Dispatched" },
      { value: "delivered", label: "Delivered" },
    ];
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Orders</h1>
        <p className="text-muted-foreground">
          Update order status and track fulfillment
        </p>
      </div>

      {Object.values(ordersByShop || {}).map(({ shop, orders: shopOrders }) => (
        <Card key={shop.name}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <CardTitle>{shop.name}</CardTitle>
            </div>
            <CardDescription>{shop.location}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coffee</TableHead>
                  <TableHead>Producer</TableHead>
                  <TableHead>Ordered</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shopOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.greenCoffee.name}</TableCell>
                    <TableCell>{order.greenCoffee.producer}</TableCell>
                    <TableCell>
                      <div>
                        <div>Small Bags: {order.smallBags}</div>
                        <div>Large Bags: {order.largeBags}</div>
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
                        {order.updatedBy && (
                          <div className="text-xs text-muted-foreground">
                            by {order.updatedBy.username}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(order.updatedAt || order.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          form.reset({
                            smallBags: order.smallBags,
                            largeBags: order.largeBags,
                            status: "roasted",
                          });
                          setIsUpdateDialogOpen(true);
                        }}
                      >
                        Update Status
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
              Update the quantity and status for this order
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="py-4">
              <div className="mb-4">
                <h4 className="font-medium">{selectedOrder.greenCoffee.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedOrder.shop.name} - Order #{selectedOrder.id}
                </p>
              </div>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(async (data) => {
                  if (!selectedOrder) return;
                  try {
                    await updateOrderMutation.mutateAsync({
                      ...data,
                      orderId: selectedOrder.id,
                    });
                  } catch (error) {
                    console.error("Failed to update order:", error);
                  }
                })} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="smallBags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Small Bags (200g)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max={selectedOrder.smallBags}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="largeBags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Large Bags (1kg)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max={selectedOrder.largeBags}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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
                            {getAvailableStatuses().map(status => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
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