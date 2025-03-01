import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { GreenCoffee } from "@shared/schema";
import { Loader2, Package, ArrowRight } from "lucide-react";
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

type OrderWithDetails = {
  id: number;
  shopId: number;
  greenCoffeeId: number;
  smallBags: number;
  largeBags: number;
  status: string;
  createdAt: string;
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
};

const updateOrderSchema = z.object({
  smallBags: z.coerce.number().min(0),
  largeBags: z.coerce.number().min(0),
  status: z.enum(["roasted", "dispatched", "delivered"]),
});

type UpdateOrderValues = z.infer<typeof updateOrderSchema>;

export default function RoastingOrders() {
  const { toast } = useToast();
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

  const onSubmit = form.handleSubmit(async (data) => {
    if (!selectedOrder) return;

    try {
      await updateOrderMutation.mutateAsync({
        ...data,
        orderId: selectedOrder.id,
      });
    } catch (error) {
      console.error("Failed to update order:", error);
    }
  });

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roasting Orders</h1>
        <p className="text-muted-foreground">
          Manage and track orders from all retail shops
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <CardTitle>Pending Orders</CardTitle>
          </div>
          <CardDescription>Orders waiting to be roasted and dispatched</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop</TableHead>
                <TableHead>Coffee</TableHead>
                <TableHead>Producer</TableHead>
                <TableHead>Small Bags (200g)</TableHead>
                <TableHead>Large Bags (1kg)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.shop.name}</TableCell>
                  <TableCell className="font-medium">{order.greenCoffee.name}</TableCell>
                  <TableCell>{order.greenCoffee.producer}</TableCell>
                  <TableCell>{order.smallBags}</TableCell>
                  <TableCell>{order.largeBags}</TableCell>
                  <TableCell className="capitalize">{order.status}</TableCell>
                  <TableCell>{formatDate(order.createdAt)}</TableCell>
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
                <form onSubmit={onSubmit} className="space-y-4">
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
                            <option value="roasted">Roasted</option>
                            <option value="dispatched">Dispatched</option>
                            <option value="delivered">Delivered</option>
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
                      <ArrowRight className="h-4 w-4 mr-2" />
                    )}
                    Update Order
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