import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RoastingForm } from "@/components/coffee/roasting-form";
import { InventoryGrid } from "@/components/coffee/inventory-grid";
import { GreenCoffeeForm } from "@/components/coffee/green-coffee-form";
import { greenCoffee, type RoastingBatch } from "@shared/schema";
import { Loader2, PackagePlus } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useActiveShop } from "@/hooks/use-active-shop";
import { ShopSelector } from "@/components/layout/shop-selector";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type GreenCoffee = typeof greenCoffee.$inferSelect;

export default function Roasting() {
  const { user } = useAuth();
  const [selectedCoffee, setSelectedCoffee] = useState<GreenCoffee | null>(null);
  const [showAddCoffeeDialog, setShowAddCoffeeDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredBatches = batches?.filter((batch) =>
    batch.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const canAddGreenCoffee = ["owner", "roasteryOwner"].includes(user?.role || "");

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roasting Management</h1>
        <p className="text-muted-foreground">
          Record roasting batches and track coffee production.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Green Coffee Inventory</CardTitle>
            <CardDescription>Current stock levels and selection for roasting</CardDescription>
          </div>
          {canAddGreenCoffee && (
            <Dialog open={showAddCoffeeDialog} onOpenChange={setShowAddCoffeeDialog}>
              <DialogTrigger asChild>
                <Button>Add New Coffee</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <CardHeader>
                  <CardTitle>Add New Green Coffee</CardTitle>
                  <CardDescription>Register a new green coffee in the inventory</CardDescription>
                </CardHeader>
                <CardContent>
                  <GreenCoffeeForm onSuccess={() => setShowAddCoffeeDialog(false)} />
                </CardContent>
              </DialogContent>
            </Dialog>
          )}
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
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">All Batches</h2>
            <Button>New Batch</Button>
          </div>
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search batches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Filtered Batches</CardTitle>
          <CardDescription>Filtered batches based on search query</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredBatches?.map((batch) => (
              <div
                key={batch.id}
                className="rounded-lg border bg-card text-card-foreground shadow-sm"
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold">Batch #{batch.id}</h3>
                  <p className="text-sm text-muted-foreground">
                    Status: {batch.status}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Planned Amount: {batch.plannedAmount} kg
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Small Bags Produced: {batch.smallBagsProduced || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Large Bags Produced: {batch.largeBagsProduced || 0}
                  </p>
                </div>
                <div className="p-6 pt-0">
                  <Button variant="outline">View Details</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}