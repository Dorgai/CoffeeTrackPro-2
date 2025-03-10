import { useQuery } from "@tanstack/react-query";
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { OrderForm } from "@/components/coffee/order-form";
import { ShopSelector } from "@/components/layout/shop-selector";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const { activeShop, setActiveShop } = useActiveShop();
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);

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
      )}

      <Dialog
        open={isOrderDialogOpen}
        onOpenChange={setIsOrderDialogOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <CardHeader>
            <CardTitle>Place New Order</CardTitle>
            <CardDescription>Order coffee from the roastery</CardDescription>
          </CardHeader>
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
    </div>
  );
}