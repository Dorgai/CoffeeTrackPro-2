import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertGreenCoffeeSchema, GreenCoffee } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
import { Textarea } from "@/components/ui/textarea";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Create schema for form validation
const formSchema = insertGreenCoffeeSchema.extend({
  // Convert string to number for decimal fields
  currentStock: z.coerce.number().min(0),
  minThreshold: z.coerce.number().min(0),
});

type FormValues = z.infer<typeof formSchema>;

export function GreenCoffeeForm({
  coffee,
  onSuccess,
}: {
  coffee?: GreenCoffee;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const isEditing = !!coffee;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: coffee
      ? {
          ...coffee,
          details: coffee.details || {},
        }
      : {
          name: "",
          producer: "",
          country: "",
          altitude: "",
          cuppingNotes: "",
          details: {},
          currentStock: 0,
          minThreshold: 0,
        },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      console.log("Submitting form data:", data);
      if (isEditing) {
        const response = await apiRequest("PATCH", `/api/green-coffee/${coffee.id}`, data);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update coffee");
        }
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/green-coffee", data);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to create coffee");
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
      console.error("Form submission error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    console.log("Form submission initiated:", data);
    mutation.mutate(data);
  };

  return (
    <>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Green Coffee" : "Add New Green Coffee"}</CardTitle>
        <CardDescription>
          {isEditing
            ? "Update the details of this green coffee"
            : "Enter details for new green coffee"}
        </CardDescription>
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

            <div className="grid grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="altitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Altitude</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 1800-2200m" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="cuppingNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cupping Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Floral, citrus, bergamot with a bright acidity"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currentStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Stock (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
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
                    <FormLabel>Target Stock Level (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-sm text-muted-foreground">
                      Set your desired stock level. The system will alert when stock falls below this amount.
                    </p>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={mutation.isPending}>
                {isEditing ? "Update Coffee" : "Add Coffee"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </>
  );
}