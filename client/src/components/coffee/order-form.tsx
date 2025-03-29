import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { greenCoffee } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useActiveShop } from "@/hooks/use-active-shop";

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
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

type GreenCoffee = typeof greenCoffee.$inferSelect;

// Define schema for order form
const orderFormSchema = z.object({
  greenCoffeeId: z.number(),
  smallBags: z.coerce.number().min(0, "Cannot be negative"),
  largeBags: z.coerce.number().min(0, "Cannot be negative"),
}).refine(data => data.smallBags > 0 || data.largeBags > 0, {
  message: "Please order at least one bag",
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
  const { user } = useAuth();
  const { activeShop } = useActiveShop();

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
      if (!activeShop?.id) {
        throw new Error("Please select a shop first");
      }

      if (!user?.id) {
        throw new Error("You must be logged in to place orders");
      }

      const res = await apiRequest("POST", "/api/orders", {
        ...data,
        shopId: activeShop.id,
        createdById: user.id,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create order");
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory"] });
      if (activeShop?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/orders", activeShop.id] });
        queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory", activeShop.id] });
      }

      if (onSuccess) onSuccess();

      toast({
        title: "Order Created",
        description: "Your order has been placed successfully",
      });

      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await createOrderMutation.mutateAsync(data);
    } catch (error) {
      console.error("Failed to create order:", error);
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">{coffee.name}</h3>
        <div className="text-sm text-muted-foreground">
          <p>Producer: {coffee.producer}</p>
          <p>Grade: {coffee.grade}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={onSubmit}>
          <input type="hidden" name="greenCoffeeId" value={coffee.id} />

          <div className="grid grid-cols-2 gap-4 mb-4">
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
                      {...field} 
                      className="text-right" 
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
                      {...field} 
                      className="text-right" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={createOrderMutation.isPending || !activeShop?.id}
          >
            {createOrderMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Placing Order...
              </>
            ) : (
              "Place Order"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}