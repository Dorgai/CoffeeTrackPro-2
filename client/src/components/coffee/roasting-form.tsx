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
  plannedAmount: string;
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
      plannedAmount: "0",
      smallBagsProduced: 0,
      largeBagsProduced: 0,
    },
  });

  const { data: coffee } = useQuery({
    queryKey: [`/api/green-coffee/${greenCoffeeId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/green-coffee/${greenCoffeeId}`);
      if (!res.ok) throw new Error("Failed to fetch coffee details");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/roasting-batches", {
        ...data,
        greenCoffeeId: Number(greenCoffeeId),
        status: "planned"
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create roasting batch");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roasting-batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/green-coffee"] });
      if (onSuccess) onSuccess();
      toast({
        title: "Success",
        description: "Roasting batch has been recorded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record roasting batch.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = form.handleSubmit(async (data: FormValues) => {
    try {
      if (coffee && Number(data.plannedAmount) > Number(coffee.currentStock)) {
        toast({
          title: "Insufficient Stock",
          description: "The planned amount exceeds the available stock.",
          variant: "destructive",
        });
        return;
      }

      await createMutation.mutateAsync(data);
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
              name="plannedAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Planned Amount (kg)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value)}
                      value={field.value}
                    />
                  </FormControl>
                  <FormDescription>
                    Available stock: {coffee ? `${coffee.currentStock} kg` : 'Loading...'}
                  </FormDescription>
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
                    <FormLabel>Small Bags (200g)</FormLabel>
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
                    <FormLabel>Large Bags (1kg)</FormLabel>
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

            {coffee && (
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex justify-between items-center">
                    <span>Remaining Stock: {(Number(coffee.currentStock) - Number(form.getValues("plannedAmount"))).toFixed(2)} kg</span>
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