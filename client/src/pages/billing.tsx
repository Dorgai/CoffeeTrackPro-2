import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Receipt } from "lucide-react";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { parseISO, format } from "date-fns";
import { BillingEvent, coffeeGrades } from "@shared/schema";

type DeliveredQuantities = {
  grade: string;
  smallBagsQuantity: number;
  largeBagsQuantity: number;
};

type BillingEventWithDetails = BillingEvent & {
  details: Array<{
    grade: string;
    smallBagsQuantity: number;
    largeBagsQuantity: number;
  }>;
};

export default function BillingPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const isRoasteryOwner = user?.role === "roasteryOwner";

  // Fetch delivered orders quantities
  const { data: deliveredQuantities, isLoading: loadingQuantities } = useQuery<DeliveredQuantities[]>({
    queryKey: ["/api/billing/delivered-quantities"],
  });

  // Fetch billing history
  const { data: billingHistory, isLoading: loadingHistory } = useQuery<BillingEventWithDetails[]>({
    queryKey: ["/api/billing/history"],
  });

  // Handle generate billing event
  const handleGenerateBillingEvent = async () => {
    try {
      const res = await apiRequest("POST", "/api/billing/generate", {});
      if (!res.ok) {
        throw new Error("Failed to generate billing event");
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/billing/delivered-quantities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });

      toast({
        title: "Success",
        description: "Billing event generated successfully",
      });
    } catch (error) {
      console.error("Error generating billing event:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate billing event",
        variant: "destructive",
      });
    }
  };

  if (isLoading || loadingQuantities || loadingHistory) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || (user.role !== "roasteryOwner" && user.role !== "retailOwner")) {
    return <Redirect to="/" />;
  }

  const hasDeliveredOrders = deliveredQuantities?.some(
    q => q.smallBagsQuantity > 0 || q.largeBagsQuantity > 0
  );

  const formatDateTime = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, "MMM d, yyyy HH:mm:ss");
    } catch (error) {
      console.error("Error formatting date:", dateStr, error);
      return dateStr;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing Management</h1>
          <p className="text-muted-foreground">
            {isRoasteryOwner
              ? "Manage billing events and track delivered orders"
              : "View billing events and delivered orders"}
          </p>
        </div>
        {isRoasteryOwner && (
          <Button
            onClick={handleGenerateBillingEvent}
            disabled={!hasDeliveredOrders}
          >
            <Receipt className="h-4 w-4 mr-2" />
            Generate Billing Event
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Billing Cycle</CardTitle>
          <CardDescription>Orders in delivered status pending billing</CardDescription>
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
              {deliveredQuantities?.map((qty) => (
                <TableRow key={qty.grade}>
                  <TableCell className="font-medium">{qty.grade}</TableCell>
                  <TableCell>{qty.smallBagsQuantity}</TableCell>
                  <TableCell>{qty.largeBagsQuantity}</TableCell>
                </TableRow>
              ))}
              {(!deliveredQuantities || deliveredQuantities.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No orders in delivered status
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
            <CardDescription>Previous billing events with quantities</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period Start</TableHead>
                  <TableHead>Period End</TableHead>
                  {coffeeGrades.map(grade => (
                    <TableHead key={grade}>{grade}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingHistory.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{formatDateTime(event.cycleStartDate)}</TableCell>
                    <TableCell>{formatDateTime(event.cycleEndDate)}</TableCell>
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