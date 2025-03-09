import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface DispatchedCoffeeProps {
  shopId?: number;
}

type PendingConfirmation = {
  id: number;
  coffeeName: string;
  producer: string;
  dispatchedSmallBags: number;
  dispatchedLargeBags: number;
};

export function DispatchedCoffeeConfirmation({ shopId }: DispatchedCoffeeProps) {
  const { toast } = useToast();

  // Basic data fetching
  const { data: confirmations, isLoading } = useQuery<PendingConfirmation[]>({
    queryKey: ["/api/dispatched-coffee/confirmations", shopId],
    queryFn: async () => {
      const url = shopId 
        ? `/api/dispatched-coffee/confirmations?shopId=${shopId}`
        : "/api/dispatched-coffee/confirmations";

      const res = await apiRequest("GET", url);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to fetch confirmations");
      }

      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!confirmations || confirmations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No New Arrivals</CardTitle>
          <CardDescription>
            There are currently no pending coffee shipments to confirm.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Basic list view
  return (
    <Card>
      <CardHeader>
        <CardTitle>New Inventory Arrivals</CardTitle>
        <CardDescription>
          Confirm received coffee quantities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {confirmations.map((confirmation) => (
            <div
              key={confirmation.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="space-y-1">
                <h4 className="font-medium">
                  {confirmation.coffeeName}
                </h4>
                <p className="text-sm text-muted-foreground">
                  Producer: {confirmation.producer}
                </p>
                <p className="text-sm text-muted-foreground">
                  Dispatched: {confirmation.dispatchedSmallBags} small bags, {confirmation.dispatchedLargeBags} large bags
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => toast({
                  title: "Coming Soon",
                  description: "Confirmation functionality is being rebuilt"
                })}
              >
                Confirm Receipt
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}