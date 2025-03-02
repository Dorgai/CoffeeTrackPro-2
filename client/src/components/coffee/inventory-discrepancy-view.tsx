import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { InventoryDiscrepancy } from "@shared/schema";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";

export function InventoryDiscrepancyView() {
  const { user } = useAuth();

  if (!user || user.role !== "roaster") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You do not have permission to view discrepancy reports.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Fetch discrepancies with expanded relations
  const { data: discrepancies, isLoading, error } = useQuery<(InventoryDiscrepancy & {
    confirmation: {
      greenCoffee: { name: string; producer: string };
      shop: { name: string; location: string };
    };
  })[]>({
    queryKey: [`/api/inventory-discrepancies`],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/inventory-discrepancies");
        return await res.json();
      } catch (error) {
        console.error("Error fetching discrepancies:", error);
        throw error;
      }
    },
    enabled: user.role === "roaster",
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Error</CardTitle>
          <CardDescription>
            You don't have permission to view discrepancy reports. Please contact your administrator.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!discrepancies || discrepancies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Discrepancies</CardTitle>
          <CardDescription>
            All received coffee quantities match the dispatched amounts.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Discrepancies</CardTitle>
        <CardDescription>
          Reported differences between dispatched and received coffee quantities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <thead>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Coffee</TableHead>
              <TableHead>Small Bags Difference</TableHead>
              <TableHead>Large Bags Difference</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </thead>
          <TableBody>
            {discrepancies.map((discrepancy) => (
              <TableRow key={discrepancy.id}>
                <TableCell>{formatDate(discrepancy.createdAt)}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{discrepancy.confirmation.shop.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {discrepancy.confirmation.shop.location}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{discrepancy.confirmation.greenCoffee.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {discrepancy.confirmation.greenCoffee.producer}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={discrepancy.smallBagsDifference < 0 ? "destructive" : "default"}>
                    {discrepancy.smallBagsDifference > 0 ? "+" : ""}{discrepancy.smallBagsDifference}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={discrepancy.largeBagsDifference < 0 ? "destructive" : "default"}>
                    {discrepancy.largeBagsDifference > 0 ? "+" : ""}{discrepancy.largeBagsDifference}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={
                    discrepancy.status === "open" 
                      ? "destructive" 
                      : discrepancy.status === "investigating" 
                        ? "outline"
                        : "default"
                  }>
                    {discrepancy.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}