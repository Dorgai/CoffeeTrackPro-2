import { DispatchedCoffeeConfirmation } from "@/components/coffee/dispatched-coffee-confirmation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RetailNewArrivals() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>New Inventory Arrivals</CardTitle>
          <CardDescription>
            Confirm and update inventory quantities for newly received coffee shipments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DispatchedCoffeeConfirmation />
        </CardContent>
      </Card>
    </div>
  );
}
