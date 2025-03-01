import { useQuery } from "@tanstack/react-query";
import { Loader2, Package, ShoppingCart } from "lucide-react";
import { Shop } from "@shared/schema";
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

type AllInventoryItem = {
  id: number;
  shopId: number;
  greenCoffeeId: number;
  smallBags: number;
  largeBags: number;
  updatedAt: string;
  shop: Shop;
  greenCoffee: {
    name: string;
    producer: string;
  };
  updatedBy: {
    username: string;
  };
};

type AllOrderItem = {
  id: number;
  shopId: number;
  greenCoffeeId: number;
  smallBags: number;
  largeBags: number;
  status: string;
  createdAt: string;
  shop: Shop;
  greenCoffee: {
    name: string;
  };
  user: {
    username: string;
  };
};

export default function RetailOverview() {
  const { data: allInventory, isLoading: loadingInventory } = useQuery<AllInventoryItem[]>({
    queryKey: ["/api/retail-inventory"],
  });

  const { data: allOrders, isLoading: loadingOrders } = useQuery<AllOrderItem[]>({
    queryKey: ["/api/orders"],
  });

  if (loadingInventory || loadingOrders) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Retail Overview</h1>
        <p className="text-muted-foreground">
          Monitor inventory and orders across all retail locations
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <CardTitle>All Shops Inventory</CardTitle>
          </div>
          <CardDescription>Current inventory across all shops</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop</TableHead>
                <TableHead>Coffee</TableHead>
                <TableHead>Small Bags (200g)</TableHead>
                <TableHead>Large Bags (1kg)</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Updated By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allInventory?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.shop.name}</TableCell>
                  <TableCell className="font-medium">{item.greenCoffee.name}</TableCell>
                  <TableCell>{item.smallBags}</TableCell>
                  <TableCell>{item.largeBags}</TableCell>
                  <TableCell>{formatDate(item.updatedAt)}</TableCell>
                  <TableCell>{item.updatedBy.username}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <CardTitle>All Shops Orders</CardTitle>
          </div>
          <CardDescription>Orders from all retail locations</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop</TableHead>
                <TableHead>Coffee</TableHead>
                <TableHead>Small Bags</TableHead>
                <TableHead>Large Bags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ordered By</TableHead>
                <TableHead>Order Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allOrders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.shop.name}</TableCell>
                  <TableCell className="font-medium">{order.greenCoffee.name}</TableCell>
                  <TableCell>{order.smallBags}</TableCell>
                  <TableCell>{order.largeBags}</TableCell>
                  <TableCell className="capitalize">{order.status}</TableCell>
                  <TableCell>{order.user.username}</TableCell>
                  <TableCell>{formatDate(order.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
