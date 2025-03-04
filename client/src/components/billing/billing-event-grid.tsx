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
  const isManager = user?.role === "shopManager";

  // Fetch quantities since last billing event
  const { data: billingData, isLoading, error } = useQuery<BillingQuantityResponse>({
    queryKey: ["/api/billing/quantities"],
  });

  // Create billing event mutation
  const createBillingEventMutation = useMutation({
    mutationFn: async () => {
      if (!billingData?.quantities) return;

      const res = await apiRequest("POST", "/api/billing/events", {
        primarySplitPercentage: primarySplit,
        secondarySplitPercentage: secondarySplit,
        quantities: billingData.quantities
      });

      if (!res.ok) {
        throw new Error("Failed to create billing event");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/quantities"] });
      toast({
        title: "Success",
        description: "Billing event created successfully",
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive">
        Error loading billing data: {error.message}
      </div>
    );
  }

  const calculateSplitQuantities = (quantity: number, split: number) => {
    return Math.round((quantity * split) / 100);
  };

  return (
    <div className="space-y-8">
      {/* Billing Interval Information */}
      <Card>
        <CardHeader>
          <CardTitle>Current Billing Cycle</CardTitle>
          <CardDescription>
            Data gathered since: {billingData?.fromDate ? format(new Date(billingData.fromDate), 'PPP') : 'N/A'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Quantities Grid */}
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
                <TableHead>Total Bags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coffeeGrades.map((grade) => {
                const gradeData = billingData?.quantities.find(q => q.grade === grade) || 
                  { smallBagsQuantity: 0, largeBagsQuantity: 0 };
                return (
                  <TableRow key={grade}>
                    <TableCell className="font-medium">{grade}</TableCell>
                    <TableCell>{gradeData.smallBagsQuantity}</TableCell>
                    <TableCell>{gradeData.largeBagsQuantity}</TableCell>
                    <TableCell>
                      {gradeData.smallBagsQuantity + gradeData.largeBagsQuantity}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Split View - Only show for roasteryOwner */}
      {!isManager && (
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
                  const gradeData = billingData?.quantities.find(q => q.grade === grade) || 
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
                disabled={createBillingEventMutation.isPending || !billingData?.quantities}
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