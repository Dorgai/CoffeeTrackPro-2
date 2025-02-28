import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RoastingForm } from "@/components/coffee/roasting-form";
import { InventoryGrid } from "@/components/coffee/inventory-grid";
import type { GreenCoffee, RoastingBatch } from "@shared/schema";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Roasting() {
  const [selectedCoffee, setSelectedCoffee] = useState<GreenCoffee | null>(null);

  const { data: coffees, isLoading: loadingCoffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
  });

  const { data: batches, isLoading: loadingBatches } = useQuery<RoastingBatch[]>({
    queryKey: ["/api/roasting-batches"],
  });

  if (loadingCoffees || loadingBatches) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roasting Management</h1>
        <p className="text-muted-foreground">
          Record roasting batches and track coffee production.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Select Coffee to Roast</CardTitle>
            </CardHeader>
            <CardContent>
              <InventoryGrid
                coffees={coffees || []}
                onSelect={setSelectedCoffee}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {selectedCoffee && (
            <RoastingForm
              greenCoffeeId={selectedCoffee.id}
              onSuccess={() => setSelectedCoffee(null)}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Recent Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Green Coffee</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Loss</TableHead>
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
                          {new Date(batch.roastedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{coffee?.name}</TableCell>
                        <TableCell>{batch.roastedAmount.toString()}kg</TableCell>
                        <TableCell>{batch.roastingLoss.toString()}kg</TableCell>
                        <TableCell>
                          {batch.smallBagsProduced} × 200g
                          <br />
                          {batch.largeBagsProduced} × 1kg
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
