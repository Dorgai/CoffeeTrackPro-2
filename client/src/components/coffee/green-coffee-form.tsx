import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGreenCoffeeSchema, GreenCoffee, coffeeGrades } from "@shared/schema";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FormValues = {
  name: string;
  producer: string;
  country: string;
  currentStock: number;
  minThreshold: number;
  grade: typeof coffeeGrades[number];
};

export function GreenCoffeeForm({
  coffee,
  onSuccess
}: {
  coffee?: GreenCoffee;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const isEditing = !!coffee;

  const form = useForm<FormValues>({
    resolver: zodResolver(insertGreenCoffeeSchema),
    defaultValues: coffee || {
      name: "",
      producer: "",
      country: "",
      currentStock: 0,
      minThreshold: 0,
      grade: "TBD"
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Convert numbers to strings for decimal fields before sending to server
      const processedData = {
        ...data,
        currentStock: String(data.currentStock),
        minThreshold: String(data.minThreshold)
      };

      if (isEditing) {
        const response = await apiRequest("PATCH", `/api/green-coffee/${coffee.id}`, processedData);
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to update coffee");
        }
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/green-coffee", processedData);
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to create coffee");
        }
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/green-coffee"] });
      toast({
        title: isEditing ? "Coffee Updated" : "Coffee Created",
        description: isEditing ? "Green coffee has been updated" : "New green coffee has been added",
      });
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await mutation.mutateAsync(data);
    } catch (error) {
      console.error("Submit error:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Green Coffee" : "Add New Green Coffee"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coffee Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Ethiopia Yirgacheffe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="producer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Producer</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Konga Cooperative" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Ethiopia" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {coffeeGrades.map((grade) => (
                          <SelectItem key={grade} value={grade}>
                            {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Stock (kg)</FormLabel>
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

              <FormField
                control={form.control}
                name="minThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Threshold (kg)</FormLabel>
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
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (isEditing ? "Updating..." : "Adding...") : (isEditing ? "Update Coffee" : "Add Coffee")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}