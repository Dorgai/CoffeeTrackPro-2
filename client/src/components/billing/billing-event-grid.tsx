import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { BillingEvent, BillingEventDetail, coffeeGrades } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isValid } from "date-fns";
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
  const isReadOnly = user?.role === "retailOwner";

  const { data: billingData, isLoading: quantitiesLoading, refetch: refetchQuantities } = useQuery<BillingQuantityResponse>({
    queryKey: ["/api/billing/quantities"],
  });

  const { data: billingHistory, isLoading: historyLoading, refetch: refetchHistory } = useQuery<Array<BillingEvent & { details: BillingEventDetail[] }>>({
    queryKey: ["/api/billing/history"],
  });

  const createBillingEventMutation = useMutation({
    mutationFn: async () => {
      if (!billingData?.quantities || !Array.isArray(billingData.quantities)) {
        console.error("Invalid billing data:", billingData);
        throw new Error("Invalid billing quantities data");
      }

      if (primarySplit + secondarySplit !== 100) {
        throw new Error("Split percentages must sum to 100%");
      }

      if (!user?.id) {
        throw new Error("User ID is required");
      }

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
        cycleEndDate: new Date().toISOString(),
        createdById: user.id
      };

      console.log("Creating billing event with payload:", JSON.stringify(payload, null, 2));

      const res = await apiRequest("POST", "/api/billing/events", payload);

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Failed to create billing event:", errorData);
        throw new Error(errorData.message || "Failed to create billing event");
      }

      return res.json();
    },
    onSuccess: async () => {
      // Force refetch both quantities and history data
      await Promise.all([
        refetchQuantities(),
        refetchHistory()
      ]);

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

  if (quantitiesLoading || historyLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const hasNonZeroQuantities = billingData?.quantities?.some(
    q => q.smallBagsQuantity > 0 || q.largeBagsQuantity > 0
  );

  const formatDateSafely = (dateString: string) => {
    try {
      if (!dateString) return 'N/A';
      const date = parseISO(dateString);
      if (!isValid(date)) throw new Error('Invalid date');
      return format(date, 'PPP p'); // "Sep 15, 2023, 3:25 PM" format
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return 'N/A';
    }
  };

  const getCyclePeriodDisplay = (fromDate: string) => {
    try {
      if (!fromDate) return 'N/A';
      const date = parseISO(fromDate);
      if (!isValid(date)) return 'N/A';
      if (date.getTime() === 0) return 'First billing cycle';
      return `Data gathered since: ${formatDateSafely(fromDate)}`;
    } catch (error) {
      console.error("Error formatting cycle period:", error);
      return 'N/A';
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Current Billing Cycle</CardTitle>
          <CardDescription>
            {billingData?.fromDate ? getCyclePeriodDisplay(billingData.fromDate) : 'N/A'}
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
              {(!billingData?.quantities || billingData.quantities.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No quantities found for current billing cycle
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {billingHistory && billingHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>Past billing cycles and their quantities</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cycle Period</TableHead>
                  {coffeeGrades.map(grade => (
                    <TableHead key={grade}>{grade}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingHistory.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      {formatDateSafely(event.cycleStartDate)} to {formatDateSafely(event.cycleEndDate)}
                    </TableCell>
                    {coffeeGrades.map(grade => {
                      const details = event.details?.find(d => d.grade === grade);
                      return (
                        <TableCell key={grade}>
                          {details ? (
                            <>
                              {details.smallBagsQuantity} small,{' '}
                              {details.largeBagsQuantity} large
                            </>
                          ) : (
                            '0 small, 0 large'
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!isManager && !isReadOnly && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue Split Settings</CardTitle>
            <CardDescription>
              Adjust split percentages and generate billing event
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

            <div className="mt-6">
              <Button
                onClick={() => createBillingEventMutation.mutate()}
                disabled={
                  createBillingEventMutation.isPending ||
                  !hasNonZeroQuantities ||
                  primarySplit + secondarySplit !== 100
                }
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