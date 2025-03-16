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
import { format, parseISO } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

type BillingQuantity = {
  grade: string;
  smallBagsQuantity: number;
  largeBagsQuantity: number;
};

type BillingQuantityResponse = {
  fromDate: string;
  quantities: BillingQuantity[];
};

export function BillingEventGrid() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [primarySplit, setPrimarySplit] = useState(70);
  const [secondarySplit, setSecondarySplit] = useState(30);
  const isManager = user?.role === "shopManager";
  const isReadOnly = user?.role === "retailOwner";

  const { data: billingData, isLoading: quantitiesLoading } = useQuery<BillingQuantityResponse>({
    queryKey: ["/api/billing/quantities"],
    queryFn: async () => {
      console.log("Fetching billing quantities...");
      const res = await apiRequest("GET", "/api/billing/quantities");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to fetch billing quantities");
      }
      const data = await res.json();
      console.log("Received billing quantities:", data);
      return data;
    }
  });

  const { data: billingHistory, isLoading: historyLoading } = useQuery<Array<BillingEvent & { details: BillingEventDetail[] }>>({
    queryKey: ["/api/billing/history"],
    queryFn: async () => {
      console.log("Fetching billing history...");
      const res = await apiRequest("GET", "/api/billing/history");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to fetch billing history");
      }
      const data = await res.json();
      console.log("Received billing history:", data);
      return data;
    }
  });

  const createBillingEventMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        primarySplitPercentage: primarySplit,
        secondarySplitPercentage: secondarySplit,
        cycleStartDate: billingData?.fromDate || new Date().toISOString(),
        cycleEndDate: new Date().toISOString(),
        quantities: billingData?.quantities || []
      };

      console.log("Creating billing event with payload:", payload);
      const res = await apiRequest("POST", "/api/billing/events", payload);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create billing event");
      }

      return res.json();
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

  if (quantitiesLoading || historyLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const formatDateSafely = (dateStr: string) => {
    try {
      if (!dateStr) return 'N/A';
      const date = parseISO(dateStr);
      return format(date, 'PPP p');
    } catch (error) {
      console.error("Error formatting date:", dateStr, error);
      return 'N/A';
    }
  };

  const hasDeliveredOrders = billingData?.quantities?.some(
    q => q.smallBagsQuantity > 0 || q.largeBagsQuantity > 0
  );

  return (
    <div className="space-y-8">
      {/* Current Billing Cycle */}
      <Card>
        <CardHeader>
          <CardTitle>Current Billing Cycle</CardTitle>
          <CardDescription>
            {billingData?.fromDate ? 
              `Billing data collected since: ${formatDateSafely(billingData.fromDate)}` : 
              'No current billing cycle'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grade</TableHead>
                <TableHead>Small Bags (200g)</TableHead>
                <TableHead>Large Bags (1kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coffeeGrades.map((grade) => {
                const quantities = billingData?.quantities?.find(q => q.grade === grade) || {
                  smallBagsQuantity: 0,
                  largeBagsQuantity: 0
                };
                return (
                  <TableRow key={grade}>
                    <TableCell className="font-medium">{grade}</TableCell>
                    <TableCell>{quantities.smallBagsQuantity}</TableCell>
                    <TableCell>{quantities.largeBagsQuantity}</TableCell>
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

      {/* Revenue Split Settings */}
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
                  !hasDeliveredOrders ||
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

      {/* Billing History */}
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
                  <TableHead>Period</TableHead>
                  {coffeeGrades.map(grade => (
                    <TableHead key={grade}>{grade}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingHistory.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>From: {formatDateSafely(event.cycleStartDate)}</span>
                        <span>To: {formatDateSafely(event.cycleEndDate)}</span>
                      </div>
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
    </div>
  );
}