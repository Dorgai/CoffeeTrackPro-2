import { useQuery } from "@tanstack/react-query";
import { GreenCoffee } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { InventoryGrid } from "@/components/coffee/inventory-grid";
import { GreenCoffeeForm } from "@/components/coffee/green-coffee-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { ShopSelector } from "@/components/layout/shop-selector";

export default function Inventory() {
  const { user } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);

  const { data: coffees, isLoading, error } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/green-coffee");
      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(errorData);
      }
      return res.json();
    },
  });

  const { data: retailInventory, isLoading: loadingInventory } = useQuery({
    queryKey: ["/api/retail-inventory", selectedShopId],
    enabled: user?.role === "roasteryOwner" && !!selectedShopId,
  });

  if (isLoading || loadingInventory) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
          Error loading inventory: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Green Coffee Inventory</h1>
          <p className="text-muted-foreground">
            {user?.role === "roaster"
              ? "View and manage roastery coffee inventory"
              : "Manage your green coffee beans inventory and track stock levels"}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {user?.role === "roasteryOwner" && (
            <ShopSelector
              value={selectedShopId}
              onChange={setSelectedShopId}
            />
          )}

          {user?.role === "roasteryOwner" && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>Add New Coffee</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <GreenCoffeeForm 
                  onSuccess={() => {
                    setIsAddDialogOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <InventoryGrid
        coffees={coffees || []}
        shopId={selectedShopId}
        retailInventory={retailInventory}
      />
    </div>
  );
}