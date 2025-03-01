import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { GreenCoffee } from "@shared/schema";
import { Loader2, Coffee } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { RetailInventoryForm } from "@/components/coffee/retail-inventory-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { History, Package2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";


export default function Retail() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCoffee, setSelectedCoffee] = useState<GreenCoffee | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  const { data: coffees, isLoading: loadingCoffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
  });

  const { data: retailInventory, isLoading: loadingInventory } = useQuery({
    queryKey: ["/api/retail-inventory"],
    enabled: !!user?.shopId, // Only fetch if user has a shopId
  });

  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ["/api/orders", user?.shopId],
    enabled: !!user?.shopId,
  });

  const updateInventoryMutation = useMutation({
    mutationFn: async (data: { greenCoffeeId: number; smallBags: number; largeBags: number }) => {
      if (!user?.shopId) {
        throw new Error("No shop assigned to user");
      }

      const res = await apiRequest("POST", "/api/retail-inventory", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update inventory");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory"] });
      toast({
        title: "Success",
        description: "Inventory updated successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Inventory update error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update inventory",
        variant: "destructive",
      });
    },
  });

  // Handle inventory updates with proper error handling
  const handleUpdateInventory = async (coffeeId: number, smallBags: number, largeBags: number) => {
    try {
      if (!user?.shopId) {
        toast({
          title: "Error",
          description: "You must be assigned to a shop to update inventory",
          variant: "destructive",
        });
        return;
      }

      await updateInventoryMutation.mutateAsync({
        greenCoffeeId: coffeeId,
        smallBags,
        largeBags,
      });
    } catch (error) {
      console.error("Failed to update inventory:", error);
    }
  };

  if (!user?.shopId) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
          You are not assigned to any shop. Please contact an administrator.
        </div>
      </div>
    );
  }

  if (loadingCoffees || loadingInventory || loadingOrders) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Get current inventory for a coffee
  const getCurrentInventory = (coffeeId: number) => {
    const inventory = retailInventory?.find(item => item.greenCoffeeId === coffeeId);
    return {
      smallBags: inventory?.smallBags || 0,
      largeBags: inventory?.largeBags || 0,
      id: inventory?.id,
      updatedAt: inventory?.updatedAt,
      updatedBy: inventory?.updatedBy,
    };
  };

  // Get orders for a specific coffee
  const getCoffeeOrders = (coffeeId: number) => {
    return orders?.filter(order => order.greenCoffeeId === coffeeId) || [];
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Retail Management</h1>
        <p className="text-muted-foreground">
          Manage your shop's inventory and view orders.
        </p>
      </div>

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package2 className="h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Order History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Retail Inventory</CardTitle>
              <CardDescription>
                Current stock of roasted coffee available for order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coffee</TableHead>
                    <TableHead>Producer</TableHead>
                    <TableHead>Small Bags (200g)</TableHead>
                    <TableHead>Large Bags (1kg)</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Updated By</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coffees?.map((coffee) => {
                    const inventory = getCurrentInventory(coffee.id);
                    return (
                      <TableRow key={coffee.id}>
                        <TableCell className="font-medium">{coffee.name}</TableCell>
                        <TableCell>{coffee.producer}</TableCell>
                        <TableCell>{inventory.smallBags}</TableCell>
                        <TableCell>{inventory.largeBags}</TableCell>
                        <TableCell>
                          {inventory.updatedAt ? formatDate(inventory.updatedAt) : 'Never'}
                        </TableCell>
                        <TableCell>{inventory.updatedBy?.username || '-'}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCoffee(coffee);
                              setIsUpdateDialogOpen(true);
                            }}
                          >
                            Update
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>
                Recent orders placed by retailers
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
                      <TableHead>Ordered By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const coffee = coffees?.find(c => c.id === order.greenCoffeeId);
                      const totalWeight = (order.smallBags * 0.2) + (order.largeBags * 1);

                      return (
                        <TableRow key={order.id}>
                          <TableCell>{formatDate(order.createdAt || "")}</TableCell>
                          <TableCell className="font-medium">{coffee?.name || 'Unknown'}</TableCell>
                          <TableCell>{order.smallBags}</TableCell>
                          <TableCell>{order.largeBags}</TableCell>
                          <TableCell>{totalWeight.toFixed(2)} kg</TableCell>
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
        </TabsContent>
      </Tabs>

      <Dialog 
        open={isUpdateDialogOpen && !!selectedCoffee} 
        onOpenChange={(open) => {
          setIsUpdateDialogOpen(open);
          if (!open) setSelectedCoffee(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          {selectedCoffee && (
            <RetailInventoryForm
              coffee={selectedCoffee}
              currentInventory={getCurrentInventory(selectedCoffee.id)}
              onSuccess={() => {
                setIsUpdateDialogOpen(false);
                setSelectedCoffee(null);
              }}
              onUpdate={handleUpdateInventory}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}