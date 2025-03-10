import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StockStatus } from "./stock-status";

type RestockDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: number | null;
};

export function RestockDialog({ open, onOpenChange, shopId }: RestockDialogProps) {
  const { toast } = useToast();
  const [quantities, setQuantities] = useState<Record<number, { small: number; large: number }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch current inventory for the selected shop
  const { data: inventory, isLoading: loadingInventory } = useQuery({
    queryKey: ["/api/retail-inventory", shopId],
    enabled: Boolean(shopId) && open,
  });

  // Fetch available coffees
  const { data: coffees, isLoading: loadingCoffees } = useQuery({
    queryKey: ["/api/green-coffee"],
    enabled: open,
  });

  const handleSubmit = async () => {
    if (!shopId) return;
    setIsSubmitting(true);

    try {
      // Create orders for each coffee with quantity > 0
      const updatePromises = Object.entries(quantities).map(async ([coffeeId, { small, large }]) => {
        if (small > 0 || large > 0) {
          const response = await apiRequest("POST", "/api/orders", {
            shopId,
            greenCoffeeId: parseInt(coffeeId),
            smallBags: small,
            largeBags: large,
            status: "pending",
          });

          if (!response.ok) {
            throw new Error(await response.text());
          }

          return response.json();
        }
      });

      await Promise.all(updatePromises);

      // Invalidate relevant queries
      await queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory", shopId] });

      toast({
        title: "Success",
        description: "Restock orders created successfully",
      });

      // Reset state and close dialog
      setQuantities({});
      onOpenChange(false);
    } catch (error) {
      console.error("Restock error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create restock orders",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!shopId) {
    return (
      <DialogContent>
        <Alert>
          <AlertDescription>
            Please select a shop before creating a restock order.
          </AlertDescription>
        </Alert>
      </DialogContent>
    );
  }

  const isLoading = loadingInventory || loadingCoffees;

  return (
    <DialogContent className="sm:max-w-[700px]">
      <DialogHeader>
        <DialogTitle>Create Restock Order</DialogTitle>
        <DialogDescription>
          Enter quantities needed for each coffee type
        </DialogDescription>
      </DialogHeader>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coffee</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead className="text-right">Order Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coffees?.map((coffee) => {
                const currentStock = inventory?.find(inv => inv.greenCoffeeId === coffee.id);

                return (
                  <TableRow key={coffee.id}>
                    <TableCell className="font-medium">
                      {coffee.name}
                      <div className="text-sm text-muted-foreground">
                        Producer: {coffee.producer}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StockStatus
                        smallBags={currentStock?.smallBags || 0}
                        largeBags={currentStock?.largeBags || 0}
                        showWarning={true}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <div>
                          <div className="text-sm font-medium mb-1">Small Bags (200g)</div>
                          <Input
                            type="number"
                            min="0"
                            value={quantities[coffee.id]?.small || 0}
                            onChange={(e) => setQuantities(prev => ({
                              ...prev,
                              [coffee.id]: { ...prev[coffee.id], small: parseInt(e.target.value) || 0 }
                            }))}
                          />
                        </div>
                        <div>
                          <div className="text-sm font-medium mb-1">Large Bags (1kg)</div>
                          <Input
                            type="number"
                            min="0"
                            value={quantities[coffee.id]?.large || 0}
                            onChange={(e) => setQuantities(prev => ({
                              ...prev,
                              [coffee.id]: { ...prev[coffee.id], large: parseInt(e.target.value) || 0 }
                            }))}
                          />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!shopId || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Submit Order
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}