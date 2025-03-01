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
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  // Fetch available coffees
  const { data: coffees } = useQuery<any[]>({
    queryKey: ["/api/green-coffee"],
    enabled: isOpen,
  });

  // Fetch shop's default quantity
  const { data: shop } = useQuery<Shop>({
    queryKey: ["/api/shops", activeShop?.id],
    enabled: isOpen && !!activeShop,
  });

  // Fetch current inventory
  const { data: currentInventory } = useQuery<InventoryItem[]>({
    queryKey: ["/api/retail-inventory", activeShop?.id],
    enabled: isOpen && !!activeShop,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/retail-inventory?shopId=${activeShop?.id}`);
      return res.json();
    },
  });

  // Initialize quantities with the difference between default and current
  const initializeQuantities = () => {
    if (coffees && shop?.defaultOrderQuantity && currentInventory) {
      const initialQuantities = coffees.reduce((acc, coffee) => {
        // Find current inventory for this coffee
        const currentStock = currentInventory.find(inv => inv.greenCoffeeId === coffee.id);
        const currentQuantity = currentStock ? (currentStock.smallBags || 0) : 0;

        // Calculate how many to order to reach the default quantity
        const quantityToOrder = Math.max(0, shop.defaultOrderQuantity - currentQuantity);

        acc[coffee.id] = quantityToOrder;
        return acc;
      }, {} as Record<number, number>);
      setQuantities(initialQuantities);
    }
  };

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const res = await apiRequest("POST", "/api/orders", orderData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
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
    Object.entries(quantities).forEach(([coffeeId, quantity]) => {
      if (quantity > 0) {
        createOrderMutation.mutate({
          shopId: activeShop.id,
          greenCoffeeId: parseInt(coffeeId),
          smallBags: quantity,
          largeBags: 0, // Could be made configurable in the future
          status: "pending",
        });
      }
    });
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
              Please select a shop from the dropdown in the navigation bar before creating a restock order.
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
                <TableHead className="text-right">Order Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coffees?.map((coffee) => {
                const currentStock = currentInventory?.find(inv => inv.greenCoffeeId === coffee.id);
                const currentQuantity = currentStock ? (currentStock.smallBags || 0) : 0;

                return (
                  <TableRow key={coffee.id}>
                    <TableCell className="font-medium">{coffee.name}</TableCell>
                    <TableCell>{coffee.producer}</TableCell>
                    <TableCell className="text-right">{currentQuantity}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        value={quantities[coffee.id] || 0}
                        onChange={(e) => setQuantities(prev => ({
                          ...prev,
                          [coffee.id]: parseInt(e.target.value) || 0
                        }))}
                        className="w-20 ml-auto"
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