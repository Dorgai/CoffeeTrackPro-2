import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOrderSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OrderForm({ 
  greenCoffeeId,
  maxSmallBags,
  maxLargeBags,
  onSuccess 
}: { 
  greenCoffeeId: number;
  maxSmallBags: number;
  maxLargeBags: number;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const form = useForm({
    resolver: zodResolver(insertOrderSchema),
    defaultValues: {
      greenCoffeeId,
      shopId: user?.shopId!,
      smallBags: 0,
      largeBags: 0,
      status: "pending",
    },
  });

  const orderMutation = useMutation({
    mutationFn: async (data: typeof form.getValues) => {
      const res = await apiRequest("POST", "/api/orders", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", user?.shopId] });
      toast({
        title: "Success",
        description: "Order placed successfully",
      });
      onSuccess?.();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Place Order</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => orderMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="smallBags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Small Bags (200g)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0"
                      max={maxSmallBags}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="largeBags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Large Bags (1kg)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      min="0" 
                      max={maxLargeBags}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              disabled={orderMutation.isPending}
              className="w-full"
            >
              Place Order
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { GreenCoffee } from "@shared/schema";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Define schema for order form
const orderFormSchema = z.object({
  greenCoffeeId: z.number(),
  smallBags: z.coerce.number().min(0, "Cannot be negative"),
  largeBags: z.coerce.number().min(0, "Cannot be negative"),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

export function OrderForm({
  coffee,
  availableBags,
  onSuccess,
}: {
  coffee: GreenCoffee;
  availableBags: { smallBags: number; largeBags: number };
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [formData, setFormData] = useState<OrderFormValues | null>(null);
  const [maxStockPercentage, setMaxStockPercentage] = useState(80);

  // Fetch max stock percentage setting
  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings?.maxStockPercentage) {
      setMaxStockPercentage(settings.maxStockPercentage);
    }
  }, [settings]);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      greenCoffeeId: coffee.id,
      smallBags: 0,
      largeBags: 0,
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: OrderFormValues) => {
      return apiRequest("/api/orders", {
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory"] });
      if (onSuccess) onSuccess();
      setIsConfirmOpen(false);
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    // Validation checks
    if (data.smallBags === 0 && data.largeBags === 0) {
      toast({
        title: "Order Validation",
        description: "Please select at least one bag to order",
        variant: "destructive",
      });
      return;
    }

    // Check if ordered quantities exceed available stock
    if (data.smallBags > availableBags.smallBags || data.largeBags > availableBags.largeBags) {
      toast({
        title: "Insufficient Stock",
        description: "The ordered quantity exceeds available stock",
        variant: "destructive",
      });
      return;
    }

    // Calculate if ordered weight exceeds max allowed percentage of green coffee
    const orderedWeight = (data.smallBags * 0.2) + (data.largeBags * 1);
    const maxAllowedWeight = Number(coffee.currentStock) * (maxStockPercentage / 100);

    if (orderedWeight > maxAllowedWeight) {
      toast({
        title: "Order Exceeds Limit",
        description: `Orders cannot exceed ${maxStockPercentage}% of available green coffee stock`,
        variant: "destructive",
      });
      return;
    }

    // Store form data and open confirmation dialog
    setFormData(data);
    setIsConfirmOpen(true);
  });

  const confirmOrder = async () => {
    if (formData) {
      try {
        await createOrderMutation.mutateAsync(formData);
        toast({
          title: "Order Placed",
          description: "Your order has been placed successfully",
        });
        form.reset({
          greenCoffeeId: coffee.id,
          smallBags: 0,
          largeBags: 0,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to place order",
          variant: "destructive",
        });
      }
    }
  };

  // Calculate total weight and price
  const smallBags = form.watch("smallBags");
  const largeBags = form.watch("largeBags");
  const totalWeight = (smallBags * 0.2) + (largeBags * 1);
  const maxAllowedWeight = Number(coffee.currentStock) * (maxStockPercentage / 100);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{coffee.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="smallBags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Small Bags (200g)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max={availableBags.smallBags} {...field} />
                      </FormControl>
                      <FormDescription>
                        Available: {availableBags.smallBags}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="largeBags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Large Bags (1kg)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max={availableBags.largeBags} {...field} />
                      </FormControl>
                      <FormDescription>
                        Available: {availableBags.largeBags}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Total Weight:</span>
                  <span>{totalWeight.toFixed(2)} kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Max Allowed:</span>
                  <span>{maxAllowedWeight.toFixed(2)} kg ({maxStockPercentage}% of stock)</span>
                </div>
              </div>

              {totalWeight > maxAllowedWeight && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Order exceeds {maxStockPercentage}% of available green coffee stock
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={createOrderMutation.isPending}
              >
                Submit Order
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Your Order</DialogTitle>
            <DialogDescription>
              Please review your order details before confirming.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-medium">Coffee:</p>
                <p className="text-muted-foreground">{coffee.name}</p>
              </div>
              <div>
                <p className="font-medium">Producer:</p>
                <p className="text-muted-foreground">{coffee.producer}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="font-medium">Order Details:</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex justify-between">
                  <span>Small Bags (200g):</span>
                  <span>{formData?.smallBags || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Large Bags (1kg):</span>
                  <span>{formData?.largeBags || 0}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between font-medium">
              <span>Total Weight:</span>
              <span>
                {(
                  (formData?.smallBags || 0) * 0.2 + 
                  (formData?.largeBags || 0) * 1
                ).toFixed(2)} kg
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmOrder} 
              disabled={createOrderMutation.isPending}
            >
              Confirm Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
