import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { DispatchedCoffeeConfirmation } from "@/components/coffee/dispatched-coffee-confirmation";
import { InventoryDiscrepancyView } from "@/components/coffee/inventory-discrepancy-view";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShopSelector } from "@/components/layout/shop-selector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useActiveShop } from "@/hooks/use-active-shop";

export default function RetailNewArrivals() {
  const { user } = useAuth();
  const { activeShop } = useActiveShop();

  // Get the active shop
  const { data: userShops, isLoading: isLoadingShops } = useQuery({
    queryKey: ["/api/user/shops"],
    enabled: !!user
  });

  if (isLoadingShops) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <ShopSelector />
      </div>

      {!activeShop ? (
        <Alert>
          <AlertDescription>
            Please select a shop to view new arrivals.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>New Inventory Arrivals</CardTitle>
              <CardDescription>
                Confirm and update inventory quantities for newly received coffee shipments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DispatchedCoffeeConfirmation shopId={activeShop.id} />
            </CardContent>
          </Card>

          <InventoryDiscrepancyView />
        </div>
      )}
    </div>
  );
}