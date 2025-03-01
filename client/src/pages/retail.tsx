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
import { Link } from "wouter";
import { formatDate } from "@/lib/utils";

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
    enabled: !!user?.shopId,
  });

  const updateInventoryMutation = useMutation({
    mutationFn: async (data: { greenCoffeeId: number; smallBags: number; largeBags: number }) => {
      if (!user?.shopId) {
        throw new Error("No shop assigned to user");
      }

      console.log("Sending inventory update:", {
        ...data,
        shopId: user.shopId,
        updatedById: user.id
      });

      const res = await apiRequest("POST", "/api/retail-inventory", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update inventory");
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
        largeBags
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

  if (loadingCoffees || loadingInventory) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Retail Management</h1>
          <p className="text-muted-foreground">
            Manage your shop's inventory
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/retail/orders">View Orders</Link>
        </Button>
      </div>

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