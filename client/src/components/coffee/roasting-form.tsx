import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRoastingBatchSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "@/components/ui/info-icon";

interface FormValues {
  greenCoffeeId: number;
  greenCoffeeAmount: number;
  roastedAmount: number;
  roastingLoss: number;
  smallBagsProduced: number;
  largeBagsProduced: number;
}

export function RoastingForm({
  greenCoffeeId,
  onSuccess
}: {
  greenCoffeeId: number;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const form = useForm<FormValues>({
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

  const { data: coffee } = useQuery({
    queryKey: [`/api/green-coffee/${greenCoffeeId}`],
    queryFn: () => apiRequest("GET", `/api/green-coffee/${greenCoffeeId}`).then(res => res.json()),
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return apiRequest("POST", "/api/roasting-batches", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roasting-batches"] });
      queryClient.invalidateQueries({ queryKey: [`/api/roasting-batches/coffee/${greenCoffeeId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/green-coffee"] });
      if (onSuccess) onSuccess();
    },
  });

  const onSubmit = form.handleSubmit(async (data: FormValues) => {
    const smallBagsProduced = Number(data.smallBagsProduced) || 0;
    const largeBagsProduced = Number(data.largeBagsProduced) || 0;
    const greenCoffeeAmount = Number(data.greenCoffeeAmount) || 0;
    const roastedAmount = Number(data.roastedAmount) || 0;
    const totalPackagedWeight = (smallBagsProduced * 0.2) + largeBagsProduced;
    const roastingLoss = Math.max(0, greenCoffeeAmount - roastedAmount);

    // Check if green coffee amount exceeds current stock
    if (coffee && greenCoffeeAmount > coffee.currentStock) {
      toast({
        title: "Insufficient Stock",
        description: "The amount of green coffee exceeds the available stock.",
        variant: "destructive",
      });
      return;
    }

    // Check if packaging efficiency is at least 80%
    const packagingEfficiency = (totalPackagedWeight / roastedAmount) * 100;
    if (packagingEfficiency < 80) {
      toast({
        title: "Validation Error",
        description: "Total packaged coffee should be at least 80% of roasted coffee.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        ...data,
        greenCoffeeId: Number(greenCoffeeId),
        greenCoffeeAmount,
        roastedAmount,
        roastingLoss,
        smallBagsProduced,
        largeBagsProduced,
      });
      toast({
        title: "Roasting Batch Recorded",
        description: "The roasting batch has been recorded successfully.",
      });
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record roasting batch.",
        variant: "destructive",
      });
    }
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
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Available stock: {coffee ? `${coffee.currentStock} kg` : 'Loading...'}
                  </FormDescription>
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
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="smallBagsProduced"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Small Bags (200g) Produced</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>Total: {((field.value as number || 0) * 0.2).toFixed(2)} kg</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="largeBagsProduced"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Large Bags (1kg) Produced</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>Total: {(field.value as number || 0)} kg</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="roastingLoss"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Roasting Loss (kg)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      readOnly
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Automatically calculated as green coffee amount minus packaged coffee
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {coffee && (
              <Alert>
                <InfoIcon />
                <AlertDescription>
                  <div className="flex justify-between items-center">
                    <span>Remaining Stock: {(coffee.currentStock - (form.getValues("greenCoffeeAmount") || 0)).toFixed(2)} kg</span>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={createMutation.isPending}>
              Record Batch
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}