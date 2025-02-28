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

  const onSubmit = (data: OrderFormValues) => {
    setFormData(data);
    setIsConfirmOpen(true);
  };

  const confirmOrder = () => {
    if (formData) {
      createOrderMutation.mutate(formData);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Place Order</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        max={availableBags.smallBags}
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
                        max={availableBags.largeBags}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                disabled={createOrderMutation.isPending}
                className="w-full"
              >
                Place Order
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Order</DialogTitle>
            <DialogDescription>
              Please review your order details before confirming.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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