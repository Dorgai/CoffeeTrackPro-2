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

type RestockDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: number | null;
};

type CoffeeWithQuantity = {
  id: number;
  name: string;
  producer: string;
  quantity: number;
};

type InventoryItem = {
  greenCoffeeId: number;
  smallBags: number;
  largeBags: number;
};

export function RestockDialog({ open, onOpenChange, shopId }: RestockDialogProps) {
  const { toast } = useToast();
  const [quantities, setQuantities] = useState<Record<number, { small: number; large: number }>>({});

  // Fetch available coffees
  const { data: coffees, isLoading: loadingCoffees } = useQuery<CoffeeWithQuantity[]>({
    queryKey: ["/api/green-coffee"],
    enabled: open,
  });

  // Fetch current inventory
  const { data: currentInventory, isLoading: loadingInventory } = useQuery<InventoryItem[]>({
    queryKey: ["/api/retail-inventory", shopId],
    enabled: open && !!shopId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/retail-inventory?shopId=${shopId}`);
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json();
    },
  });

  // Create order mutation
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

  const sortedCoffees = coffees?.slice().sort((a, b) => {
    const aInventory = currentInventory?.find(inv => inv.greenCoffeeId === a.id);
    const bInventory = currentInventory?.find(inv => inv.greenCoffeeId === b.id);

    const aTotal = (aInventory?.smallBags || 0) + (aInventory?.largeBags || 0);
    const bTotal = (bInventory?.smallBags || 0) + (bInventory?.largeBags || 0);

    // First sort by whether there's any stock
    if (aTotal > 0 && bTotal === 0) return -1;
    if (aTotal === 0 && bTotal > 0) return 1;

    // Then sort by total stock in descending order
    return bTotal - aTotal;
  });

  const isLoading = loadingCoffees || loadingInventory;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create Restock Order</DialogTitle>
          <DialogDescription>
            Enter the quantities needed for each coffee type
          </DialogDescription>
        </DialogHeader>

        {!shopId && (
          <Alert variant="destructive" className="mb-4 flex-shrink-0">
            <AlertDescription>
              Please select a shop before creating a restock order.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-[200px]">Coffee</TableHead>
                    <TableHead className="w-[200px]">Producer</TableHead>
                    <TableHead className="text-right w-[150px]">Current Stock</TableHead>
                    <TableHead className="text-center w-[120px]">Small Bags</TableHead>
                    <TableHead className="text-center w-[120px]">Large Bags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCoffees?.map((coffee) => {
                    const currentStock = currentInventory?.find(inv => inv.greenCoffeeId === coffee.id);
                    return (
                      <TableRow key={coffee.id}>
                        <TableCell className="font-medium">{coffee.name}</TableCell>
                        <TableCell>{coffee.producer}</TableCell>
                        <TableCell className="text-right">
                          <div>Small: {currentStock?.smallBags || 0}</div>
                          <div>Large: {currentStock?.largeBags || 0}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            value={quantities[coffee.id]?.small || 0}
                            onChange={(e) => setQuantities(prev => ({
                              ...prev,
                              [coffee.id]: { ...prev[coffee.id], small: parseInt(e.target.value) || 0 }
                            }))}
                            className="w-20 mx-auto"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            value={quantities[coffee.id]?.large || 0}
                            onChange={(e) => setQuantities(prev => ({
                              ...prev,
                              [coffee.id]: { ...prev[coffee.id], large: parseInt(e.target.value) || 0 }
                            }))}
                            className="w-20 mx-auto"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createOrderMutation.isPending || !shopId}
          >
            {createOrderMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Submit Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}