import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GreenCoffee, RoastingBatch } from "@shared/schema";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Edit, Trash2, CoffeeIcon, Package } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GreenCoffeeForm } from "@/components/coffee/green-coffee-form";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { RoastingForm } from "@/components/coffee/roasting-form";

export default function CoffeeDetail() {
  const params = useParams();
  const { toast } = useToast();

  // Guard against invalid ID
  const coffeeId = parseInt(params.id || "0");
  if (isNaN(coffeeId) || coffeeId <= 0) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Invalid Coffee ID</CardTitle>
            <CardDescription>
              The requested coffee could not be found.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/inventory">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Inventory
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch coffee details
  const { data: coffee, isLoading: loadingCoffee, error: coffeeError } = useQuery<GreenCoffee>({
    queryKey: ["/api/green-coffee", coffeeId],
    queryFn: async () => {
      console.log("Fetching coffee details for ID:", coffeeId);
      const res = await apiRequest("GET", `/api/green-coffee/${coffeeId}`);
      if (!res.ok) throw new Error('Failed to fetch coffee details');
      const data = await res.json();
      console.log("Received coffee data:", data);
      return data;
    },
  });

  // Fetch roasting batches
  const { data: batches, isLoading: loadingBatches } = useQuery<RoastingBatch[]>({
    queryKey: ["/api/roasting-batches", coffeeId],
    queryFn: async () => {
      console.log("Fetching roasting batches for coffee:", coffeeId);
      const res = await apiRequest("GET", `/api/roasting-batches?greenCoffeeId=${coffeeId}`);
      if (!res.ok) throw new Error('Failed to fetch roasting batches');
      const data = await res.json();
      console.log("Received batches data:", data);
      return data;
    },
    enabled: !!coffeeId
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/green-coffee/${coffeeId}`);
    },
    onSuccess: () => {
      toast({
        title: "Coffee Deleted",
        description: "The coffee has been removed from inventory",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/green-coffee"] });
      window.location.href = "/inventory";
    },
  });

  if (loadingCoffee) {
    return <div className="container mx-auto py-8">Loading coffee details...</div>;
  }

  if (coffeeError) {
    console.error("Error loading coffee:", coffeeError);
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Coffee Details</CardTitle>
            <CardDescription>
              An error occurred while loading the coffee details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/inventory">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Inventory
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!coffee) {
    console.log("No coffee data available");
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Coffee Not Found</CardTitle>
            <CardDescription>
              The requested coffee could not be found.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/inventory">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Inventory
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log("Rendering coffee details:", coffee);

  // Calculate total roasted and total packaged amounts
  const totalRoasted = batches?.reduce((sum, batch) =>
    sum + (batch.status === 'completed' ? Number(batch.plannedAmount) : 0), 0) || 0;
  const totalSmallBags = batches?.reduce((sum, batch) =>
    sum + (batch.smallBagsProduced || 0), 0) || 0;
  const totalLargeBags = batches?.reduce((sum, batch) =>
    sum + (batch.largeBagsProduced || 0), 0) || 0;
  const totalPackaged = (totalSmallBags * 0.2) + (totalLargeBags * 1); // In kg

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <Link href="/inventory">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Inventory
            </Button>
          </Link>
          <h2 className="text-sm text-muted-foreground">
            Home / Coffee / {coffee.name}
          </h2>
        </div>

        <div className="flex space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <GreenCoffeeForm
                coffee={coffee}
                onSuccess={() => {
                  toast({
                    title: "Coffee Updated",
                    description: "Green coffee has been updated",
                  });
                  queryClient.invalidateQueries({ queryKey: [`/api/green-coffee/${coffeeId}`] });
                }}
              />
            </DialogContent>
          </Dialog>

          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("Are you sure you want to delete this coffee? This action cannot be undone.")) {
                deleteMutation.mutate();
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{coffee.name}</CardTitle>
          <CardDescription>
            {coffee.producer} • {coffee.country}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Details</h3>
                <Separator className="my-2" />

                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="font-medium text-muted-foreground">Current Stock:</dt>
                    <dd>{coffee.currentStock} kg</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-muted-foreground">Minimum Threshold:</dt>
                    <dd>{coffee.minThreshold} kg</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-muted-foreground">Grade:</dt>
                    <dd>{coffee.grade}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-muted-foreground">Added on:</dt>
                    <dd>{formatDate(coffee.createdAt)}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-semibold">Additional Information</h3>
                <Separator className="my-2" />
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {coffee.notes || "No additional information available"}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold">Inventory Summary</h3>
              <Separator className="my-2" />

              <div className="grid grid-cols-2 gap-4 mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CoffeeIcon className="h-5 w-5 mr-2 text-primary" />
                        <span className="font-medium">Roasted</span>
                      </div>
                      <span className="text-xl font-bold">{totalRoasted.toFixed(2)} kg</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Package className="h-5 w-5 mr-2 text-primary" />
                        <span className="font-medium">Packaged</span>
                      </div>
                      <span className="text-xl font-bold">{totalPackaged.toFixed(2)} kg</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Small Bags (200g)</span>
                      <span className="text-xl font-bold">{totalSmallBags}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Large Bags (1kg)</span>
                      <span className="text-xl font-bold">{totalLargeBags}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Roasting History</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    Record Roasting Batch
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <RoastingForm
                    greenCoffeeId={coffeeId}
                    onSuccess={() => {
                      toast({
                        title: "Batch Recorded",
                        description: "Roasting batch has been recorded successfully",
                      });
                      queryClient.invalidateQueries({ queryKey: ["/api/roasting-batches"] });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
            <Separator className="my-2" />

            {loadingBatches ? (
              <div>Loading roasting history...</div>
            ) : batches && batches.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Green Coffee (kg)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Small Bags (200g)</TableHead>
                    <TableHead>Large Bags (1kg)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>{formatDate(batch.roastedAt || batch.createdAt)}</TableCell>
                      <TableCell>{batch.plannedAmount}</TableCell>
                      <TableCell>{batch.status}</TableCell>
                      <TableCell>{batch.smallBagsProduced || 0}</TableCell>
                      <TableCell>{batch.largeBagsProduced || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No roasting batches recorded yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}