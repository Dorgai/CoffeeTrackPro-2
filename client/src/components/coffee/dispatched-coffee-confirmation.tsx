import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DispatchedCoffeeConfirmation as DispatchConfirmationType } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DispatchedCoffeeProps {
  shopId: number;
}

export function DispatchedCoffeeConfirmation({ shopId }: DispatchedCoffeeProps) {
  const { toast } = useToast();
  const [selectedConfirmation, setSelectedConfirmation] = useState<DispatchConfirmationType | null>(null);
  const [receivedQuantities, setReceivedQuantities] = useState({
    smallBags: 0,
    largeBags: 0
  });

  // Fetch both pending dispatched coffee confirmations and coffee details
  const { data: confirmations, isLoading } = useQuery<(DispatchConfirmationType & { coffee?: { name: string } })[]>({
    queryKey: ["/api/dispatched-coffee/confirmations", shopId],
    queryFn: async () => {
      console.log("Fetching confirmations for shop:", shopId);
      const res = await apiRequest("GET", `/api/dispatched-coffee/confirmations?shopId=${shopId}`);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      const confirmations = await res.json();
      console.log("Received confirmations:", confirmations);

      // Fetch coffee details for each confirmation
      const confirmationsWithCoffee = await Promise.all(
        confirmations.map(async (confirmation) => {
          const coffeeRes = await apiRequest("GET", `/api/green-coffee/${confirmation.greenCoffeeId}`);
          const coffee = await coffeeRes.json();
          return { ...confirmation, coffee };
        })
      );

      return confirmationsWithCoffee;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Return a message when there are no pending confirmations
  if (!confirmations || confirmations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No New Arrivals</CardTitle>
          <CardDescription>
            There are currently no pending coffee shipments to confirm.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <p>Once coffee is dispatched to your shop, you'll be able to confirm the received quantities here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Confirm received quantities
  const confirmMutation = useMutation({
    mutationFn: async (data: {
      confirmationId: number;
      receivedSmallBags: number;
      receivedLargeBags: number;
    }) => {
      const res = await apiRequest("POST", "/api/dispatched-coffee/confirm", data);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dispatched-coffee/confirmations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory"] });
      setSelectedConfirmation(null);
      toast({
        title: "Success",
        description: "Inventory has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConfirm = () => {
    if (!selectedConfirmation) return;

    confirmMutation.mutate({
      confirmationId: selectedConfirmation.id,
      receivedSmallBags: receivedQuantities.smallBags,
      receivedLargeBags: receivedQuantities.largeBags,
    });
  };

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
              <div>
                <h4 className="font-medium">{confirmation.coffee?.name}</h4>
                <p className="text-sm text-muted-foreground">
                  Dispatched: {confirmation.dispatchedSmallBags} small bags, {confirmation.dispatchedLargeBags} large bags
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedConfirmation(confirmation);
                  setReceivedQuantities({
                    smallBags: confirmation.dispatchedSmallBags,
                    largeBags: confirmation.dispatchedLargeBags,
                  });
                }}
              >
                Confirm Receipt
              </Button>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog 
        open={!!selectedConfirmation}
        onOpenChange={(open) => {
          if (!open) setSelectedConfirmation(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Received Quantities</DialogTitle>
            <DialogDescription>
              Enter the actual quantities received for {selectedConfirmation?.coffee?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Small Bags (200g)</Label>
              <Input
                type="number"
                min="0"
                value={receivedQuantities.smallBags}
                onChange={(e) => setReceivedQuantities(prev => ({
                  ...prev,
                  smallBags: parseInt(e.target.value) || 0
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Large Bags (1kg)</Label>
              <Input
                type="number"
                min="0"
                value={receivedQuantities.largeBags}
                onChange={(e) => setReceivedQuantities(prev => ({
                  ...prev,
                  largeBags: parseInt(e.target.value) || 0
                }))}
              />
            </div>

            {selectedConfirmation && (
              receivedQuantities.smallBags !== selectedConfirmation.dispatchedSmallBags ||
              receivedQuantities.largeBags !== selectedConfirmation.dispatchedLargeBags
            ) && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  The quantities entered differ from what was dispatched. This will create a discrepancy report.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedConfirmation(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}