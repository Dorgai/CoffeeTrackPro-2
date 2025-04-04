import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StockStatus } from "./stock-status";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { type GreenCoffee } from "@shared/schema";

type RestockDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: number | null;
};

type Quantities = Record<number, { small: number; large: number }>;

export function RestockDialog({ open, onOpenChange, shopId }: RestockDialogProps) {
  const { toast } = useToast();
  const [quantities, setQuantities] = useState<Quantities>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Reset quantities when dialog opens/closes or shop changes
  useEffect(() => {
    if (!open || !shopId) {
      setQuantities({});
    }
  }, [open, shopId]);

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

  const handleQuantityChange = (
    coffeeId: number,
    type: 'small' | 'large',
    value: string
  ) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    setQuantities(prev => ({
      ...prev,
      [coffeeId]: {
        ...prev[coffeeId] || { small: 0, large: 0 },
        [type]: numValue
      }
    }));
  };

  const restockMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await api.post("/api/coffee/restock", {
        coffeeId: coffees?.find(c => c.id === coffeeId)?.id,
        amount,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory"] });
      toast.success("Coffee restocked successfully");
      onOpenChange(false);
      setQuantities({});
    },
    onError: (error) => {
      toast.error("Failed to restock coffee");
      console.error("Restock error:", error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(quantities).some(({ small, large }) => small > 0 || large > 0)) {
      restockMutation.mutate(Object.values(quantities).reduce((total, { small, large }) => total + small + large, 0));
    }
  };

  if (!shopId) {
    return (
      <DialogContent>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a shop to create a restock order.
          </AlertDescription>
        </Alert>
      </DialogContent>
    );
  }

  const isLoading = loadingInventory || loadingCoffees;

  return (
    <DialogContent className="sm:max-w-[800px]">
      <DialogHeader>
        <DialogTitle>Create Restock Order</DialogTitle>
        <DialogDescription>
          Enter quantities needed for each coffee type. Current stock levels are shown for reference.
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
                const isLowStock = (currentStock?.smallBags || 0) < 10 || (currentStock?.largeBags || 0) < 5;

                return (
                  <TableRow key={coffee.id}>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <div>
                          <div className="font-medium">{coffee.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Producer: {coffee.producer}
                          </div>
                        </div>
                        {isLowStock && (
                          <Badge variant="destructive" className="mt-0.5">Low Stock</Badge>
                        )}
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
                            onChange={(e) => handleQuantityChange(coffee.id, 'small', e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <div className="text-sm font-medium mb-1">Large Bags (1kg)</div>
                          <Input
                            type="number"
                            min="0"
                            value={quantities[coffee.id]?.large || 0}
                            onChange={(e) => handleQuantityChange(coffee.id, 'large', e.target.value)}
                            className="w-full"
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
          disabled={isSubmitting}
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