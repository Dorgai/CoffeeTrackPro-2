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
import { InfoIcon } from "lucide-react";

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
      console.log("Submitting roasting batch data:", data);
      const response = await apiRequest("POST", "/api/roasting-batches", data);
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error(errorData.message || "Failed to create roasting batch");
      }
      return response.json();
    },
    onSuccess: () => {
      console.log("Roasting batch created successfully");
      queryClient.invalidateQueries({ queryKey: ["/api/roasting-batches"] });
      queryClient.invalidateQueries({ queryKey: [`/api/roasting-batches/coffee/${greenCoffeeId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/green-coffee"] });
      if (onSuccess) onSuccess();
      toast({
        title: "Success",
        description: "Roasting batch has been recorded successfully.",
      });
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to record roasting batch.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = form.handleSubmit(async (data: FormValues) => {
    console.log("Form submitted with values:", data);
    try {
      const smallBagsProduced = Number(data.smallBagsProduced) || 0;
      const largeBagsProduced = Number(data.largeBagsProduced) || 0;
      const greenCoffeeAmount = Number(data.greenCoffeeAmount) || 0;
      const roastedAmount = Number(data.roastedAmount) || 0;
      const totalPackagedWeight = (smallBagsProduced * 0.2) + largeBagsProduced;
      const roastingLoss = Math.max(0, greenCoffeeAmount - roastedAmount);

      // Validation checks
      if (coffee && greenCoffeeAmount > Number(coffee.currentStock)) {
        toast({
          title: "Insufficient Stock",
          description: "The amount of green coffee exceeds the available stock.",
          variant: "destructive",
        });
        return;
      }

      const packagingEfficiency = (totalPackagedWeight / roastedAmount) * 100;
      if (roastedAmount > 0 && packagingEfficiency < 80) {
        toast({
          title: "Validation Error",
          description: "Total packaged coffee should be at least 80% of roasted coffee.",
          variant: "destructive",
        });
        return;
      }

      await createMutation.mutateAsync({
        ...data,
        greenCoffeeId: Number(greenCoffeeId),
        greenCoffeeAmount,
        roastedAmount,
        roastingLoss,
        smallBagsProduced,
        largeBagsProduced,
      });
    } catch (error) {
      console.error("Submit error:", error);
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
                    <FormDescription>Total: {((field.value || 0) * 0.2).toFixed(2)} kg</FormDescription>
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
                    <FormDescription>Total: {(field.value || 0)} kg</FormDescription>
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
                      value={Math.max(0, (form.getValues("greenCoffeeAmount") || 0) - (form.getValues("roastedAmount") || 0))}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Automatically calculated as green coffee amount minus roasted amount
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {coffee && (
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex justify-between items-center">
                    <span>Remaining Stock: {(Number(coffee.currentStock) - (form.getValues("greenCoffeeAmount") || 0)).toFixed(2)} kg</span>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Recording..." : "Record Batch"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}