import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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

type InventoryItem = {
  id: number;
  shopId: number;
  greenCoffeeId: number;
  smallBags: number;
  largeBags: number;
};

type CoffeeWithQuantity = {
  id: number;
  name: string;
  producer: string;
  quantity: number;
};

export function RestockDialog({ open, onOpenChange, shopId }: RestockDialogProps) {
  const { toast } = useToast();
  const [quantities, setQuantities] = useState<Record<number, { small: number; large: number }>>({});

  // Fetch current inventory for the selected shop
  const { data: currentInventory, isLoading: loadingInventory } = useQuery<InventoryItem[]>({
    queryKey: ["/api/retail-inventory", shopId],
    enabled: open && !!shopId,
    queryFn: async () => {
      if (!shopId) return [];

      console.log("Fetching inventory for shop:", shopId);
      const res = await apiRequest("GET", `/api/retail-inventory?shopId=${shopId}`);

      if (!res.ok) {
        throw new Error("Failed to fetch inventory");
      }

      const data = await res.json();
      console.log("Received inventory data:", data);
      return data;
    },
  });

  // Fetch available coffees
  const { data: coffees, isLoading: loadingCoffees } = useQuery<CoffeeWithQuantity[]>({
    queryKey: ["/api/green-coffee"],
    enabled: open,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const res = await apiRequest("POST", "/api/orders", orderData);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to create order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory", shopId] });
      toast({
        title: "Success",
        description: "Restock order created successfully",
      });
      onOpenChange(false);
      setQuantities({}); // Reset quantities
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!shopId) return;

    // Create an order for each coffee with a quantity > 0
    Object.entries(quantities).forEach(([coffeeId, { small, large }]) => {
      if (small > 0 || large > 0) {
        createOrderMutation.mutate({
          shopId,
          greenCoffeeId: parseInt(coffeeId),
          smallBags: small,
          largeBags: large,
          status: "pending",
        });
      }
    });
  };

  // Sort coffees by current stock levels
  const sortedCoffees = coffees?.slice().sort((a, b) => {
    const aInventory = currentInventory?.find(inv => inv.greenCoffeeId === a.id);
    const bInventory = currentInventory?.find(inv => inv.greenCoffeeId === b.id);

    const aTotal = (aInventory?.smallBags || 0) + (aInventory?.largeBags || 0);
    const bTotal = (bInventory?.largeBags || 0) + (bInventory?.smallBags || 0);

    if (aTotal === 0 && bTotal > 0) return 1;
    if (aTotal > 0 && bTotal === 0) return -1;
    return bTotal - aTotal;
  });

  if (!shopId) {
    return (
      <DialogContent>
        <Alert variant="destructive">
          <AlertDescription>
            Please select a shop before creating a restock order.
          </AlertDescription>
        </Alert>
      </DialogContent>
    );
  }

  const isLoading = loadingCoffees || loadingInventory;

  return (
    <DialogContent className="sm:max-w-[700px] h-[90vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>Create Restock Order</DialogTitle>
        <DialogDescription>
          Review current stock levels and enter quantities needed for each coffee type
        </DialogDescription>
      </DialogHeader>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="w-[200px]">Coffee</TableHead>
                <TableHead className="w-[200px]">Producer</TableHead>
                <TableHead className="w-[150px]">Current Stock</TableHead>
                <TableHead className="text-center">Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCoffees?.map((coffee) => {
                const currentStock = currentInventory?.find(inv => inv.greenCoffeeId === coffee.id);

                return (
                  <TableRow key={coffee.id}>
                    <TableCell className="font-medium">{coffee.name}</TableCell>
                    <TableCell>{coffee.producer}</TableCell>
                    <TableCell>
                      <StockStatus
                        smallBags={currentStock?.smallBags || 0}
                        largeBags={currentStock?.largeBags || 0}
                        showWarning={true}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
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
                        <div className="flex-1">
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

      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!shopId || createOrderMutation.isPending}
        >
          {createOrderMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Submit Order
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}