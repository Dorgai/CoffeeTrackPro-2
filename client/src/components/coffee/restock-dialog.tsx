import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Shop } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useActiveShop } from "@/hooks/use-active-shop";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

export function RestockDialog() {
  const { toast } = useToast();
  const { activeShop } = useActiveShop();
  const [isOpen, setIsOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<number, { small: number; large: number }>>({});

  // Fetch available coffees
  const { data: coffees } = useQuery<CoffeeWithQuantity[]>({
    queryKey: ["/api/green-coffee"],
    enabled: isOpen,
  });

  // Fetch current inventory
  const { data: currentInventory } = useQuery<InventoryItem[]>({
    queryKey: ["/api/retail-inventory", activeShop?.id],
    enabled: isOpen && !!activeShop,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/retail-inventory?shopId=${activeShop?.id}`);
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json();
    },
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const res = await apiRequest("POST", "/api/orders", orderData);
      if (!res.ok) throw new Error("Failed to create order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory", activeShop?.id] });
      toast({
        title: "Success",
        description: "Restock order created successfully",
      });
      setIsOpen(false);
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
    if (!activeShop) return;

    // Create an order for each coffee with a quantity > 0
    Object.entries(quantities).forEach(([coffeeId, { small, large }]) => {
      if (small > 0 || large > 0) {
        createOrderMutation.mutate({
          shopId: activeShop.id,
          greenCoffeeId: parseInt(coffeeId),
          smallBags: small,
          largeBags: large,
          status: "pending",
        });
      }
    });
  };

  // Initialize quantities when dialog opens
  const initializeQuantities = () => {
    if (coffees && currentInventory) {
      const initialQuantities = coffees.reduce((acc, coffee) => {
        acc[coffee.id] = { small: 0, large: 0 };
        return acc;
      }, {} as Record<number, { small: number; large: number }>);
      setQuantities(initialQuantities);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) {
        initializeQuantities();
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Restock
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Restock Order for {activeShop?.name}</DialogTitle>
          <DialogDescription>
            Create a restock order for {activeShop?.name || "your shop"}. Adjust quantities as needed.
          </DialogDescription>
        </DialogHeader>

        {!activeShop && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              Please select a shop before creating a restock order.
            </AlertDescription>
          </Alert>
        )}

        <div className="py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coffee</TableHead>
                <TableHead>Producer</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-center">Small Bags</TableHead>
                <TableHead className="text-center">Large Bags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coffees?.map((coffee) => {
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

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createOrderMutation.isPending || !activeShop}
          >
            Submit Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}