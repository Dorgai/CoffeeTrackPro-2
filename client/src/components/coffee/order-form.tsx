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
