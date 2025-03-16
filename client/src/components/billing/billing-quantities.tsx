import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

type BillingQuantity = {
  grade: string;
  smallBagsQuantity: number;
  largeBagsQuantity: number;
};

export function BillingQuantities() {
  const { data: quantities, isLoading } = useQuery<BillingQuantity[]>({
    queryKey: ["/api/billing/quantities"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Grade</TableHead>
          <TableHead>Small Bags (200g)</TableHead>
          <TableHead>Large Bags (1kg)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {quantities?.map((quantity) => (
          <TableRow key={quantity.grade}>
            <TableCell className="font-medium">{quantity.grade}</TableCell>
            <TableCell>{quantity.smallBagsQuantity}</TableCell>
            <TableCell>{quantity.largeBagsQuantity}</TableCell>
          </TableRow>
        ))}
        {(!quantities || quantities.length === 0) && (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground">
              No quantities for current billing cycle
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}