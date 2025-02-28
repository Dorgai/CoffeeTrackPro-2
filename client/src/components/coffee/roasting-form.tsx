import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRoastingBatchSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

export function RoastingForm({ 
  greenCoffeeId,
  onSuccess 
}: { 
  greenCoffeeId: number;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(insertRoastingBatchSchema),
    defaultValues: {
      greenCoffeeId,
      greenCoffeeAmount: 0,
      roastedAmount: 0,
      roastingLoss: 0,
      smallBagsProduced: 0,
      largeBagsProduced: 0,
    },
  });

  const roastingMutation = useMutation({
    mutationFn: async (data: typeof form.getValues) => {
      const res = await apiRequest("POST", "/api/roasting-batches", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roasting-batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/green-coffee"] });
      toast({
        title: "Success",
        description: "Roasting batch recorded successfully",
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

  const onSubmit = form.handleSubmit((data) => {
    // Calculate roasting loss
    const loss = Number(data.greenCoffeeAmount) - Number(data.roastedAmount);
    roastingMutation.mutate({
      ...data,
      roastingLoss: loss,
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Roasting Batch</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="greenCoffeeAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Green Coffee Amount (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="roastedAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Roasted Amount (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="smallBagsProduced"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Small Bags (200g)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="largeBagsProduced"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Large Bags (1kg)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              disabled={roastingMutation.isPending}
              className="w-full"
            >
              Record Batch
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
