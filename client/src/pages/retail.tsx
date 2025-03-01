import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { GreenCoffee } from "@shared/schema";
import { Loader2, PackagePlus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useActiveShop } from "@/hooks/use-active-shop";
import { ShopSelector } from "@/components/layout/shop-selector";
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
import { RetailInventoryForm } from "@/components/coffee/retail-inventory-form";
import { OrderForm } from "@/components/coffee/order-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Link } from "wouter";
import { formatDate } from "@/lib/utils";
import { DispatchedCoffeeConfirmation } from "@/components/coffee/dispatched-coffee-confirmation";

export default function Retail() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeShop } = useActiveShop();
  const { data: userShops, isLoading: loadingShops } = useQuery({
    queryKey: ["/api/user/shops"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/shops");
      if (!res.ok) {
        throw new Error("Failed to fetch user shops");
      }
      return res.json();
    },
  });

  const [selectedCoffee, setSelectedCoffee] = useState<GreenCoffee | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);

  const { data: coffees, isLoading: loadingCoffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
  });

  const { data: retailInventory, isLoading: loadingInventory } = useQuery({
    queryKey: ["/api/retail-inventory", activeShop?.id],
    queryFn: async () => {
      if (!activeShop?.id) return [];
      const res = await apiRequest("GET", `/api/retail-inventory?shopId=${activeShop.id}`);
      return res.json();
    },
    enabled: !!activeShop?.id,
  });

  const updateInventoryMutation = useMutation({
    mutationFn: async (data: { greenCoffeeId: number; smallBags: number; largeBags: number }) => {
      if (!activeShop?.id) {
        throw new Error("No shop selected");
      }

      const res = await apiRequest("POST", "/api/retail-inventory", {
        ...data,
        shopId: activeShop.id,
        updatedById: user!.id
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update inventory");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory", activeShop?.id] });
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

  if (loadingCoffees || loadingInventory || loadingShops) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const getCurrentInventory = (coffeeId: number) => {
    if (!retailInventory) return { smallBags: 0, largeBags: 0, id: undefined, updatedAt: undefined, updatedBy: undefined };
    const inventory = retailInventory.find((item: any) => item.greenCoffeeId === coffeeId);
    return {
      smallBags: inventory?.smallBags || 0,
      largeBags: inventory?.largeBags || 0,
      id: inventory?.id,
      updatedAt: inventory?.updatedAt,
      updatedBy: inventory?.updatedBy,
    };
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Retail Management</h1>
            <p className="text-muted-foreground">
              Manage your shop's inventory
            </p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" asChild>
              <Link href="/retail/orders">View Orders</Link>
            </Button>
            <Button onClick={() => setIsOrderDialogOpen(true)}>
              <PackagePlus className="h-4 w-4 mr-2" />
              Place Order
            </Button>
          </div>
        </div>

        {userShops && userShops.length > 0 && (
          <div className="flex items-center gap-4">
            <ShopSelector />
          </div>
        )}
      </div>

      {!activeShop?.id ? (
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
          Please select a shop from the dropdown above to manage inventory.
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Retail Inventory</CardTitle>
            <CardDescription>
              Current stock of roasted coffee available for order
            </CardDescription>
          </CardHeader>
          <CardContent>
            {["roasteryOwner", "shopManager", "barista"].includes(user?.role || "") && (
              <div className="mb-6">
                <DispatchedCoffeeConfirmation shopId={activeShop.id} />
              </div>
            )}

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
      )}

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
              onUpdate={async (coffeeId, smallBags, largeBags) => {
                await updateInventoryMutation.mutateAsync({
                  greenCoffeeId: coffeeId,
                  smallBags,
                  largeBags
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

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
                  availableBags={getCurrentInventory(coffee.id)}
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