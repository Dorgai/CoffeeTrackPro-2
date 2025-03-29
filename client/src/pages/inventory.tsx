import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { greenCoffee } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, RefreshCw, PackagePlus } from "lucide-react";
import { InventoryGrid } from "@/components/coffee/inventory-grid";
import { GreenCoffeeForm } from "@/components/coffee/green-coffee-form";
import { InventoryDiscrepancyView } from "@/components/coffee/inventory-discrepancy-view";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { ShopSelector } from "@/components/layout/shop-selector";
import { RestockDialog } from "@/components/coffee/restock-dialog";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useActiveShop } from "@/hooks/use-active-shop";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type GreenCoffee = typeof greenCoffee.$inferSelect;

export default function Inventory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
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

  const handleRestock = () => {
    if (!selectedShopId) {
      toast({
        title: "Error",
        description: "Please select a shop first",
        variant: "destructive",
      });
      return;
    }
    setIsRestockOpen(true);
  };

  if (isLoading) {
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

  const showRestockControls = ["roasteryOwner", "retailOwner"].includes(user?.role || "");

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
          {showRestockControls && (
            <>
              <ShopSelector
                value={selectedShopId}
                onChange={setSelectedShopId}
              />
              <Button
                variant="outline"
                onClick={handleRestock}
                disabled={!selectedShopId}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Restock Shop
              </Button>
            </>
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

      {showRestockControls && !selectedShopId && (
        <Alert>
          <AlertDescription>
            Please select a shop to manage inventory and restock.
          </AlertDescription>
        </Alert>
      )}

      <InventoryGrid coffees={coffees || []} />

      {user?.role === "roaster" && (
        <div className="mt-8">
          <InventoryDiscrepancyView />
        </div>
      )}

      <RestockDialog 
        open={isRestockOpen} 
        onOpenChange={setIsRestockOpen} 
        shopId={selectedShopId} 
      />
    </div>
  );
}