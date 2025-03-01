import { useQuery } from "@tanstack/react-query";
import { Coffee } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";

export function AlertBanner() {
  const { user } = useAuth();

  // Fetch all green coffee
  const { data: coffees } = useQuery<any[]>({
    queryKey: ["/api/green-coffee"],
    enabled: user?.role === "roasteryOwner",
  });

  // Fetch all orders
  const { data: orders } = useQuery<any[]>({
    queryKey: ["/api/orders"],
    enabled: user?.role === "roasteryOwner",
  });

  if (!coffees || !orders || user?.role !== "roasteryOwner") {
    return null;
  }

  // Find coffees that have never been ordered
  const newCoffees = coffees.filter(coffee => 
    !orders.some(order => order.greenCoffeeId === coffee.id)
  );

  if (newCoffees.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto mt-4">
      {newCoffees.map(coffee => (
        <Alert key={coffee.id}>
          <Coffee className="h-4 w-4" />
          <AlertTitle>New Coffee Available!</AlertTitle>
          <AlertDescription>
            {coffee.name} from {coffee.producer} is now available for ordering.
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
