import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface InventoryDiscrepancy {
  id: number;
  shopId: number;
  greenCoffeeId: number;
  dispatchedSmallBags: number;
  dispatchedLargeBags: number;
  receivedSmallBags: number;
  receivedLargeBags: number;
  status: string;
  confirmedAt: string;
  createdAt: string;
  shopName: string;
  shopLocation: string;
  coffeeName: string;
  producer: string;
}

export function InventoryDiscrepancyView() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: discrepancies, isLoading, error } = useQuery<InventoryDiscrepancy[]>({
    queryKey: ["/api/inventory-discrepancies"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/inventory-discrepancies");
      if (!res.ok) {
        throw new Error("Failed to fetch discrepancy reports");
      }
      const data = await res.json();
      return data;
    },
    enabled: user?.role === "roaster" || user?.role === "roasteryOwner" || user?.role === "shopManager",
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
          <CardTitle>Error</CardTitle>
          <CardDescription>
            Failed to load discrepancy reports. Please try again later.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!discrepancies || discrepancies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Discrepancies Found</CardTitle>
          <CardDescription>
            Currently there are no inventory discrepancies to review.
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
          Review differences between dispatched and received coffee quantities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Coffee</TableHead>
              <TableHead>Small Bags Difference</TableHead>
              <TableHead>Large Bags Difference</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discrepancies?.map((discrepancy) => {
              const smallBagsDiff = discrepancy.receivedSmallBags - discrepancy.dispatchedSmallBags;
              const largeBagsDiff = discrepancy.receivedLargeBags - discrepancy.dispatchedLargeBags;

              return (
                <TableRow key={discrepancy.id}>
                  <TableCell>{formatDate(discrepancy.createdAt)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{discrepancy.shopName}</p>
                      <p className="text-sm text-muted-foreground">{discrepancy.shopLocation}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{discrepancy.coffeeName}</p>
                      <p className="text-sm text-muted-foreground">{discrepancy.producer}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={smallBagsDiff < 0 ? "destructive" : "default"}>
                      {smallBagsDiff > 0 ? "+" : ""}{smallBagsDiff}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={largeBagsDiff < 0 ? "destructive" : "default"}>
                      {largeBagsDiff > 0 ? "+" : ""}{largeBagsDiff}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {discrepancy.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}