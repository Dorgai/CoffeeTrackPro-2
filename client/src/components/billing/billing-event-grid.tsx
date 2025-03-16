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

  const { data: billingData, isLoading: quantitiesLoading } = useQuery<BillingQuantityResponse>({
    queryKey: ["/api/billing/quantities"],
  });

  const { data: billingHistory, isLoading: historyLoading } = useQuery<Array<BillingEvent & { details: BillingEventDetail[] }>>({
    queryKey: ["/api/billing/history"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/billing/history");
      if (!res.ok) {
        throw new Error("Failed to fetch billing history");
      }
      const events = await res.json();

      // Fetch details for all events
      const eventsWithDetails = await Promise.all(
        events.map(async (event: BillingEvent) => {
          const detailsRes = await apiRequest("GET", `/api/billing/details/${event.id}`);
          const details = detailsRes.ok ? await detailsRes.json() : [];
          return { ...event, details };
        })
      );

      return eventsWithDetails;
    }
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
      return format(date, 'PPP');
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return dateString;
    }
  };

  return (
    <div className="space-y-8">
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
              {billingHistory?.map((event) => (
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
              {(!billingHistory || billingHistory.length === 0) && (
                <TableRow>
                  <TableCell colSpan={coffeeGrades.length + 1} className="text-center text-muted-foreground">
                    No billing events found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Billing Cycle</CardTitle>
          <CardDescription>
            Data gathered since: {billingData?.fromDate ? formatDateSafely(billingData.fromDate) : 'N/A'}
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