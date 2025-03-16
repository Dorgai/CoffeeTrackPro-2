import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BillingEvent, BillingEventDetail, coffeeGrades } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

type BillingQuantityResponse = {
  fromDate: string;
  quantities: {
    grade: string;
    smallBagsQuantity: number;
    largeBagsQuantity: number;
  }[];
};

export function BillingEventGrid() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [primarySplit, setPrimarySplit] = useState(70);
  const [secondarySplit, setSecondarySplit] = useState(30);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const isManager = user?.role === "shopManager";
  const isReadOnly = user?.role === "retailOwner";

  // Create billing event mutation
  const createBillingEventMutation = useMutation({
    mutationFn: async () => {
      if (!billingData?.quantities || !Array.isArray(billingData.quantities)) {
        console.error("Invalid billing data:", billingData);
        throw new Error("Invalid billing quantities data");
      }

      if (primarySplit + secondarySplit !== 100) {
        throw new Error("Split percentages must sum to 100%");
      }

      // Filter out quantities with zero values and create valid billing quantities
      const validQuantities = coffeeGrades
        .map(grade => {
          const gradeData = billingData.quantities.find(q => q.grade === grade) || 
            { smallBagsQuantity: 0, largeBagsQuantity: 0 };
          return {
            grade,
            smallBagsQuantity: gradeData.smallBagsQuantity,
            largeBagsQuantity: gradeData.largeBagsQuantity
          };
        })
        .filter(q => q.smallBagsQuantity > 0 || q.largeBagsQuantity > 0);

      if (validQuantities.length === 0) {
        throw new Error("No quantities to bill");
      }

      const payload = {
        primarySplitPercentage: primarySplit,
        secondarySplitPercentage: secondarySplit,
        quantities: validQuantities,
        cycleStartDate: billingData.fromDate,
        cycleEndDate: new Date().toISOString()
      };

      console.log("Creating billing event with payload:", JSON.stringify(payload, null, 2));

      const res = await apiRequest("POST", "/api/billing/events", payload);

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Failed to create billing event:", errorData);
        throw new Error(errorData.message || "Failed to create billing event");
      }

      const data = await res.json();
      console.log("Billing event created successfully:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/quantities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/history"] });
      toast({
        title: "Success",
        description: "Billing event created successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Billing event creation error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch quantities since last billing event
  const { data: billingData, isLoading: quantitiesLoading } = useQuery<BillingQuantityResponse>({
    queryKey: ["/api/billing/quantities"],
  });

  // Fetch billing history
  const { data: billingHistory, isLoading: historyLoading } = useQuery<BillingEvent[]>({
    queryKey: ["/api/billing/history"],
  });

  // Fetch billing details for selected event
  const { data: selectedEventDetails, isLoading: detailsLoading } = useQuery<BillingEventDetail[]>({
    queryKey: ["/api/billing/details", selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return null;
      const response = await fetch(`/api/billing/details/${selectedEventId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch billing details");
      }
      return response.json();
    },
    enabled: selectedEventId !== null,
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setSelectedEventId(null); // Reset selection on error
    },
  });


  if (quantitiesLoading || historyLoading || detailsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const calculateSplitQuantities = (quantity: number, split: number) => {
    return Math.round((quantity * split) / 100);
  };

  return (
    <div className="space-y-8">
      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            Past billing events and their details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cycle Start</TableHead>
                <TableHead>Cycle End</TableHead>
                <TableHead>Primary Split (%)</TableHead>
                <TableHead>Secondary Split (%)</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingHistory?.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{format(new Date(event.cycleStartDate), 'PPP')}</TableCell>
                  <TableCell>{format(new Date(event.cycleEndDate), 'PPP')}</TableCell>
                  <TableCell>{Number(event.primarySplitPercentage).toFixed(2)}%</TableCell>
                  <TableCell>{Number(event.secondarySplitPercentage).toFixed(2)}%</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedEventId(event.id)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Billing Details for Selected Event */}
      {selectedEventId && selectedEventDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Billing Event Details</CardTitle>
            <CardDescription>
              Detailed quantities for billing event
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade</TableHead>
                  <TableHead>Small Bags</TableHead>
                  <TableHead>Large Bags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedEventDetails.map((detail) => (
                  <TableRow key={detail.id}>
                    <TableCell className="font-medium">{detail.grade}</TableCell>
                    <TableCell>{detail.smallBagsQuantity}</TableCell>
                    <TableCell>{detail.largeBagsQuantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Current Billing Cycle Information */}
      <Card>
        <CardHeader>
          <CardTitle>Current Billing Cycle</CardTitle>
          <CardDescription>
            Data gathered since: {billingData?.fromDate ? format(new Date(billingData.fromDate), 'PPP') : 'N/A'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Current Billing Cycle Quantities */}
      <Card>
        <CardHeader>
          <CardTitle>Current Billing Cycle Quantities</CardTitle>
          <CardDescription>
            Quantities aggregated by coffee grade since the last billing event
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grade</TableHead>
                <TableHead>Small Bags</TableHead>
                <TableHead>Large Bags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coffeeGrades.map((grade) => {
                const gradeData = billingData?.quantities?.find(q => q.grade === grade) ||
                  { smallBagsQuantity: 0, largeBagsQuantity: 0 };
                return (
                  <TableRow key={grade}>
                    <TableCell className="font-medium">{grade}</TableCell>
                    <TableCell>{gradeData.smallBagsQuantity}</TableCell>
                    <TableCell>{gradeData.largeBagsQuantity}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Split View - Only show for roasteryOwner */}
      {!isManager && !isReadOnly && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue Split View</CardTitle>
            <CardDescription>
              Adjust split percentages and view quantity distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Primary Split (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={primarySplit}
                  onChange={(e) => {
                    const newValue = Number(e.target.value);
                    setPrimarySplit(newValue);
                    setSecondarySplit(100 - newValue);
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Secondary Split (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={secondarySplit}
                  onChange={(e) => {
                    const newValue = Number(e.target.value);
                    setSecondarySplit(newValue);
                    setPrimarySplit(100 - newValue);
                  }}
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade</TableHead>
                  <TableHead>Primary Split Bags</TableHead>
                  <TableHead>Secondary Split Bags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coffeeGrades.map((grade) => {
                  const gradeData = billingData?.quantities?.find(q => q.grade === grade) ||
                    { smallBagsQuantity: 0, largeBagsQuantity: 0 };
                  const totalBags = gradeData.smallBagsQuantity + gradeData.largeBagsQuantity;
                  return (
                    <TableRow key={grade}>
                      <TableCell className="font-medium">{grade}</TableCell>
                      <TableCell>
                        {calculateSplitQuantities(totalBags, primarySplit)}
                      </TableCell>
                      <TableCell>
                        {calculateSplitQuantities(totalBags, secondarySplit)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="mt-6">
              <Button
                onClick={() => createBillingEventMutation.mutate()}
                disabled={createBillingEventMutation.isPending || !billingData?.quantities?.length}
              >
                {createBillingEventMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Generate Billing Event
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}