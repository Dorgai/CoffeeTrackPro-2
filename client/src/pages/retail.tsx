import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { GreenCoffee } from "@shared/schema";
import { Loader2, PackagePlus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
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
import { Button } from "@/components/ui/button";
import { OrderForm } from "@/components/coffee/order-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Link } from "wouter";
import { RetailInventoryTable } from "@/components/coffee/retail-inventory-table";

export default function Retail() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeShop } = useActiveShop();
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);

  const { data: coffees, isLoading: loadingCoffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
  });

  if (loadingCoffees) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Retail Management</h1>
            <p className="text-muted-foreground">
              Manage your shop's inventory and orders
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

        <div className="flex items-center gap-4">
          <ShopSelector />
        </div>
      </div>

      {!activeShop?.id ? (
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
          Please select a shop from the dropdown above to manage inventory.
        </div>
      ) : (
        <RetailInventoryTable />
      )}

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
                  availableBags={{ smallBags: 0, largeBags: 0 }}
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