import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { DispatchedCoffeeConfirmation } from "@/components/coffee/dispatched-coffee-confirmation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShopSelector } from "@/components/layout/shop-selector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function RetailNewArrivals() {
  const { user } = useAuth();

  // Get the active shop
  const { data: userShops, isLoading: isLoadingShops } = useQuery({
    queryKey: ["/api/user/shops"],
    enabled: !!user
  });

  const activeShop = userShops?.[0];

  if (isLoadingShops) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!activeShop) {
    return (
      <Alert>
        <AlertDescription>
          No shop selected. Please select a shop to view new arrivals.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <ShopSelector />
      </div>

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
    </div>
  );
}