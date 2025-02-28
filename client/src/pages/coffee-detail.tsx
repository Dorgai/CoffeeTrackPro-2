
import { useParams, useNavigate } from "react-router-dom";
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const coffeeId = parseInt(id || "0");

  const { data: coffee, isLoading: loadingCoffee } = useQuery<GreenCoffee>({
    queryKey: [`/api/green-coffee/${coffeeId}`],
    enabled: !!coffeeId,
  });

  const { data: batches, isLoading: loadingBatches } = useQuery<RoastingBatch[]>({
    queryKey: [`/api/roasting-batches/coffee/${coffeeId}`],
    enabled: !!coffeeId,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/green-coffee/${coffeeId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Coffee Deleted",
        description: "The coffee has been removed from inventory",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/green-coffee"] });
      navigate("/inventory");
    },
  });

  if (loadingCoffee) {
    return <div>Loading coffee details...</div>;
  }

  if (!coffee) {
    return <div>Coffee not found</div>;
  }

  // Calculate total roasted and total packaged amounts
  const totalRoasted = batches?.reduce((sum, batch) => sum + Number(batch.roastedAmount), 0) || 0;
  const totalSmallBags = batches?.reduce((sum, batch) => sum + batch.smallBagsProduced, 0) || 0;
  const totalLargeBags = batches?.reduce((sum, batch) => sum + batch.largeBagsProduced, 0) || 0;
  const totalPackaged = (totalSmallBags * 0.2) + (totalLargeBags * 1); // In kg

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => navigate("/inventory")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Inventory
        </Button>

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
                    <dt className="font-medium text-muted-foreground">Altitude:</dt>
                    <dd>{coffee.altitude || "Not specified"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-muted-foreground">Current Stock:</dt>
                    <dd>{coffee.currentStock} kg</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-muted-foreground">Minimum Threshold:</dt>
                    <dd>{coffee.minThreshold} kg</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-muted-foreground">Added on:</dt>
                    <dd>{formatDate(coffee.createdAt || "")}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-semibold">Cupping Notes</h3>
                <Separator className="my-2" />
                <p className="text-muted-foreground">
                  {coffee.cuppingNotes || "No cupping notes available"}
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
                      queryClient.invalidateQueries({ queryKey: [`/api/roasting-batches/coffee/${coffeeId}`] });
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
                    <TableHead>Roasted Amount (kg)</TableHead>
                    <TableHead>Roasting Loss</TableHead>
                    <TableHead>Small Bags (200g)</TableHead>
                    <TableHead>Large Bags (1kg)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>{formatDate(batch.roastedAt || "")}</TableCell>
                      <TableCell>{batch.greenCoffeeAmount}</TableCell>
                      <TableCell>{batch.roastedAmount}</TableCell>
                      <TableCell>{batch.roastingLoss} kg</TableCell>
                      <TableCell>{batch.smallBagsProduced}</TableCell>
                      <TableCell>{batch.largeBagsProduced}</TableCell>
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
