import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RoastingForm } from "@/components/coffee/roasting-form";
import { InventoryGrid } from "@/components/coffee/inventory-grid";
import type { GreenCoffee, RoastingBatch } from "@shared/schema";
import { Loader2 } from "lucide-react";
import StockProgress from "@/components/stock-progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

export default function Roasting() {
  const [selectedCoffee, setSelectedCoffee] = useState<GreenCoffee | null>(null);

  const { data: coffees, isLoading: loadingCoffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/green-coffee");
      if (!res.ok) {
        throw new Error("Failed to fetch green coffee");
      }
      return res.json();
    },
  });

  const { data: batches, isLoading: loadingBatches } = useQuery<RoastingBatch[]>({
    queryKey: ["/api/roasting-batches"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/roasting-batches");
      if (!res.ok) {
        throw new Error("Failed to fetch roasting batches");
      }
      return res.json();
    },
  });

  if (loadingCoffees || loadingBatches) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Calculate total stock and desired amounts
  const totalStock = coffees?.reduce((sum, coffee) => sum + Number(coffee.currentStock), 0) || 0;
  const totalDesired = coffees?.reduce((sum, coffee) => sum + Number(coffee.minThreshold), 0) || 0;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roasting Management</h1>
        <p className="text-muted-foreground">
          Record roasting batches and track coffee production.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Green Coffee Inventory</CardTitle>
          <CardDescription>Current stock levels and selection for roasting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <StockProgress
              current={totalStock}
              desired={totalDesired}
              label="Total Green Coffee Stock"
            />
          </div>
          <InventoryGrid
            coffees={coffees || []}
            onSelect={setSelectedCoffee}
          />
        </CardContent>
      </Card>

      {selectedCoffee && (
        <Card>
          <CardHeader>
            <CardTitle>New Roasting Batch</CardTitle>
            <CardDescription>Record a new roasting batch for {selectedCoffee.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <RoastingForm
              greenCoffeeId={selectedCoffee.id}
              onSuccess={() => setSelectedCoffee(null)}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Batches</CardTitle>
          <CardDescription>History of roasting operations</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Green Coffee</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bags Produced</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches?.map((batch) => {
                const coffee = coffees?.find(
                  (c) => c.id === batch.greenCoffeeId
                );
                return (
                  <TableRow key={batch.id}>
                    <TableCell>
                      {batch.roastedAt ? new Date(batch.roastedAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>{coffee?.name || '-'}</TableCell>
                    <TableCell>{batch.plannedAmount}kg</TableCell>
                    <TableCell>{batch.status}</TableCell>
                    <TableCell>
                      {batch.smallBagsProduced || 0} × 200g
                      <br />
                      {batch.largeBagsProduced || 0} × 1kg
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!batches || batches.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                    No roasting batches recorded yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}