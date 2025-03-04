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
import { useToast } from "@/hooks/use-toast";

type DiscrepancyWithDetails = InventoryDiscrepancy & {
  confirmation: {
    greenCoffee: { name: string; producer: string };
    shop: { name: string; location: string };
  };
};

export function InventoryDiscrepancyView() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: discrepancies, isLoading } = useQuery<DiscrepancyWithDetails[]>({
    queryKey: ["/api/inventory-discrepancies"],
    queryFn: async () => {
      console.log("Fetching discrepancies for role:", user?.role);
      const res = await apiRequest("GET", "/api/inventory-discrepancies");
      if (!res.ok) {
        throw new Error("Failed to fetch discrepancy reports");
      }
      const data = await res.json();
      console.log("Received discrepancies:", data);
      return data;
    },
    enabled: user?.role === "roaster" || user?.role === "roasteryOwner" || user?.role === "shopManager",
    onError: (error) => {
      console.error("Error fetching discrepancies:", error);
      toast({
        title: "Error",
        description: "Failed to load discrepancy reports",
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!discrepancies || discrepancies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Discrepancies Found</CardTitle>
          <CardDescription>
            Currently there are no inventory discrepancies to review. This means all received quantities match the dispatched amounts.
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
          Review and manage differences between dispatched and received coffee quantities
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
                <TableCell>{formatDate(new Date(discrepancy.createdAt))}</TableCell>
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