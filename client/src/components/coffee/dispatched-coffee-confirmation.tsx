import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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
import { Loader2, AlertTriangle, Package } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DispatchedCoffeeProps {
  shopId?: number;
}

type Confirmation = {
  id: number;
  coffeeName: string;
  producer: string;
  dispatchedSmallBags: number;
  dispatchedLargeBags: number;
  status: "pending" | "confirmed";
  orderId: number;
};

export function DispatchedCoffeeConfirmation({ shopId }: DispatchedCoffeeProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedConfirmation, setSelectedConfirmation] = useState<Confirmation | null>(null);
  const [receivedQuantities, setReceivedQuantities] = useState({
    smallBags: 0,
    largeBags: 0
  });

  // Fetch pending confirmations
  const { data: confirmations, isLoading: loadingConfirmations } = useQuery<Confirmation[]>({
    queryKey: ["/api/dispatched-coffee/confirmations", shopId],
    queryFn: async () => {
      const url = shopId 
        ? `/api/dispatched-coffee/confirmations?shopId=${shopId}`
        : "/api/dispatched-coffee/confirmations";

      const response = await apiRequest("GET", url);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch confirmations");
      }

      const data = await response.json();
      return Array.isArray(data) ? data.filter(conf => conf.status === "pending") : [];
    },
    enabled: Boolean(user)
  });

  // Confirmation mutation
  const confirmMutation = useMutation({
    mutationFn: async (data: {
      confirmationId: number;
      receivedSmallBags: number;
      receivedLargeBags: number;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const response = await apiRequest(
        "POST",
        `/api/dispatched-coffee/confirmations/${data.confirmationId}/confirm`,
        {
          receivedSmallBags: data.receivedSmallBags,
          receivedLargeBags: data.receivedLargeBags,
          confirmedById: user.id
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to confirm receipt");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dispatched-coffee/confirmations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory"] });
      toast({
        title: "Success",
        description: "Receipt confirmed successfully",
      });
      setSelectedConfirmation(null);
      setReceivedQuantities({ smallBags: 0, largeBags: 0 });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (loadingConfirmations) {
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

  if (!confirmations?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Pending Arrivals</CardTitle>
          <CardDescription>
            There are no coffee shipments waiting to be confirmed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <Package className="h-12 w-12 mb-4" />
            <p>All deliveries have been confirmed</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleConfirmClick = (confirmation: Confirmation) => {
    setSelectedConfirmation(confirmation);
    setReceivedQuantities({
      smallBags: confirmation.dispatchedSmallBags,
      largeBags: confirmation.dispatchedLargeBags
    });
  };

  const handleConfirm = () => {
    if (!selectedConfirmation) return;

    // Validate quantities
    if (receivedQuantities.smallBags < 0 || receivedQuantities.largeBags < 0) {
      toast({
        title: "Invalid Quantities",
        description: "Received quantities cannot be negative",
        variant: "destructive"
      });
      return;
    }

    if (receivedQuantities.smallBags > selectedConfirmation.dispatchedSmallBags || 
        receivedQuantities.largeBags > selectedConfirmation.dispatchedLargeBags) {
      toast({
        title: "Invalid Quantities",
        description: "Received quantities cannot exceed dispatched quantities",
        variant: "destructive"
      });
      return;
    }

    confirmMutation.mutate({
      confirmationId: selectedConfirmation.id,
      receivedSmallBags: receivedQuantities.smallBags,
      receivedLargeBags: receivedQuantities.largeBags
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
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg space-y-4 sm:space-y-0"
            >
              <div className="space-y-1">
                <h4 className="font-medium">
                  {confirmation.coffeeName}
                </h4>
                <p className="text-sm text-muted-foreground">
                  Producer: {confirmation.producer}
                </p>
                <div className="text-sm text-muted-foreground">
                  <p>Expected: {confirmation.dispatchedSmallBags} small bags (200g)</p>
                  <p>{confirmation.dispatchedLargeBags} large bags (1kg)</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => handleConfirmClick(confirmation)}
              >
                Confirm Receipt
              </Button>
            </div>
          ))}
        </div>

        <Dialog
          open={!!selectedConfirmation}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedConfirmation(null);
              setReceivedQuantities({ smallBags: 0, largeBags: 0 });
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Received Quantities</DialogTitle>
              <DialogDescription>
                Enter the actual quantities received for {selectedConfirmation?.coffeeName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Small Bags (200g)</Label>
                <Input
                  type="number"
                  min="0"
                  max={selectedConfirmation?.dispatchedSmallBags}
                  value={receivedQuantities.smallBags}
                  onChange={(e) => setReceivedQuantities(prev => ({
                    ...prev,
                    smallBags: Math.max(0, parseInt(e.target.value) || 0)
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Large Bags (1kg)</Label>
                <Input
                  type="number"
                  min="0"
                  max={selectedConfirmation?.dispatchedLargeBags}
                  value={receivedQuantities.largeBags}
                  onChange={(e) => setReceivedQuantities(prev => ({
                    ...prev,
                    largeBags: Math.max(0, parseInt(e.target.value) || 0)
                  }))}
                />
              </div>

              {selectedConfirmation && (
                (receivedQuantities.smallBags !== selectedConfirmation.dispatchedSmallBags ||
                receivedQuantities.largeBags !== selectedConfirmation.dispatchedLargeBags) && (
                  <Alert variant="warning">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      The quantities entered differ from what was dispatched. 
                      This will create a discrepancy report.
                    </AlertDescription>
                  </Alert>
                )
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedConfirmation(null);
                  setReceivedQuantities({ smallBags: 0, largeBags: 0 });
                }}
                disabled={confirmMutation.isPending}
              >
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
      </CardContent>
    </Card>
  );
}