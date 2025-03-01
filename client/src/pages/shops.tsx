import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertShopSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Shop } from "@shared/schema";
import { Loader2, Store, Plus, Package, ShoppingCart } from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

export default function Shops() {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(insertShopSchema),
    defaultValues: {
      name: "",
      location: "",
    },
  });

  const { data: shops, isLoading } = useQuery<Shop[]>({
    queryKey: ["/api/shops"],
  });

  const { data: allInventory } = useQuery<AllInventoryItem[]>({
    queryKey: ["/api/retail-inventory"],
  });

  const { data: allOrders } = useQuery<AllOrderItem[]>({
    queryKey: ["/api/orders"],
  });

  const createShopMutation = useMutation({
    mutationFn: async (data: typeof form.getValues) => {
      const res = await apiRequest("POST", "/api/shops", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shops"] });
      toast({
        title: "Success",
        description: "Shop created successfully",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
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

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shop Management</h1>
        <p className="text-muted-foreground">
          Add and manage retail coffee shops.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Add New Shop</CardTitle>
            <CardDescription>Create a new retail location</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) =>
                  createShopMutation.mutate(data)
                )}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shop Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={createShopMutation.isPending}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Shop
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing Shops</CardTitle>
            <CardDescription>All retail locations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {shops?.map((shop) => (
                <div
                  key={shop.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Store className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{shop.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {shop.location}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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