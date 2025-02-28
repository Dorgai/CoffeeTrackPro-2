
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { GreenCoffee } from "@shared/schema";
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
import { Button } from "@/components/ui/button";
import { OrderForm } from "@/components/coffee/order-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function Order() {
  const [selectedCoffee, setSelectedCoffee] = useState<GreenCoffee | null>(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);

  const { data: coffees, isLoading: loadingCoffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
  });

  const { data: retailInventory, isLoading: loadingInventory } = useQuery({
    queryKey: ["/api/retail-inventory"],
  });

  if (loadingCoffees || loadingInventory) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Get available bags for each coffee type
  const getAvailableBags = (coffeeId: number) => {
    const inventory = retailInventory?.find(item => item.greenCoffeeId === coffeeId);
    return {
      smallBags: inventory?.smallBags || 0,
      largeBags: inventory?.largeBags || 0,
    };
  };

  // Check if coffee has available inventory
  const hasInventory = (coffeeId: number) => {
    const bags = getAvailableBags(coffeeId);
    return bags.smallBags > 0 || bags.largeBags > 0;
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Place an Order</h1>
        <p className="text-muted-foreground">
          Select coffee and specify quantities to place your order.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Coffees</CardTitle>
          <CardDescription>
            Select a coffee to place an order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Producer</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Small Bags (200g)</TableHead>
                <TableHead>Large Bags (1kg)</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coffees?.map((coffee) => {
                const bags = getAvailableBags(coffee.id);
                return (
                  <TableRow key={coffee.id}>
                    <TableCell className="font-medium">{coffee.name}</TableCell>
                    <TableCell>{coffee.producer}</TableCell>
                    <TableCell>{coffee.country}</TableCell>
                    <TableCell>{bags.smallBags}</TableCell>
                    <TableCell>{bags.largeBags}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!hasInventory(coffee.id)}
                        onClick={() => {
                          setSelectedCoffee(coffee);
                          setIsOrderDialogOpen(true);
                        }}
                      >
                        Order
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {coffees?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                    No coffees available at the moment
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog 
        open={isOrderDialogOpen && !!selectedCoffee} 
        onOpenChange={(open) => {
          setIsOrderDialogOpen(open);
          if (!open) setSelectedCoffee(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          {selectedCoffee && (
            <OrderForm
              coffee={selectedCoffee}
              availableBags={getAvailableBags(selectedCoffee.id)}
              onSuccess={() => {
                setIsOrderDialogOpen(false);
                setSelectedCoffee(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
