import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGreenCoffeeSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { GreenCoffee } from "@shared/schema";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { InventoryGrid } from "@/components/coffee/inventory-grid";
import { Loader2 } from "lucide-react";

export default function Inventory() {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(insertGreenCoffeeSchema),
    defaultValues: {
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

  const { data: coffees, isLoading } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
  });

  const createCoffeeMutation = useMutation({
    mutationFn: async (data: typeof form.getValues) => {
      const res = await apiRequest("POST", "/api/green-coffee", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/green-coffee"] });
      toast({
        title: "Success",
        description: "Green coffee added successfully",
      });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Green Coffee Inventory</h1>
          <p className="text-muted-foreground">
            Manage your green coffee beans inventory and track stock levels.
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button>Add New Coffee</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Green Coffee</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) =>
                  createCoffeeMutation.mutate(data)
                )}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coffee Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cuppingNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cupping Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
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
                      <FormLabel>Minimum Threshold (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createCoffeeMutation.isPending}
                >
                  Add Coffee
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <InventoryGrid coffees={coffees || []} />
    </div>
  );
}
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Plus, Edit, Coffee } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GreenCoffee } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { GreenCoffeeForm } from "@/components/coffee/green-coffee-form";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export default function Inventory() {
  const { toast } = useToast();
  const [selectedCoffee, setSelectedCoffee] = useState<GreenCoffee | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: coffees, isLoading } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
  });

  // Group coffees by date (today vs older)
  const today = new Date().toDateString();
  const todayCoffees = coffees?.filter(
    coffee => new Date(coffee.createdAt!).toDateString() === today
  ) || [];
  const olderCoffees = coffees?.filter(
    coffee => new Date(coffee.createdAt!).toDateString() !== today
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Green Coffee Inventory</h1>
          <p className="text-muted-foreground">
            Manage your green coffee inventory and track stock levels.
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add New Coffee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <GreenCoffeeForm
              onSuccess={() => {
                toast({
                  title: "Coffee Added",
                  description: "New green coffee has been added to inventory",
                });
                setIsAddDialogOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {todayCoffees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Today's Updates</CardTitle>
            <CardDescription>
              Green coffee added or updated today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Producer</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Current Stock (kg)</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayCoffees.map((coffee) => (
                  <TableRow key={coffee.id}>
                    <TableCell>
                      <Link
                        to={`/coffee/${coffee.id}`}
                        className="text-blue-500 hover:underline font-medium"
                      >
                        {coffee.name}
                      </Link>
                    </TableCell>
                    <TableCell>{coffee.producer}</TableCell>
                    <TableCell>{coffee.country}</TableCell>
                    <TableCell>{coffee.currentStock}</TableCell>
                    <TableCell>
                      <Dialog open={isEditDialogOpen && selectedCoffee?.id === coffee.id} 
                        onOpenChange={(open) => {
                          setIsEditDialogOpen(open);
                          if (!open) setSelectedCoffee(null);
                        }}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedCoffee(coffee);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                          {selectedCoffee && (
                            <GreenCoffeeForm
                              coffee={selectedCoffee}
                              onSuccess={() => {
                                toast({
                                  title: "Coffee Updated",
                                  description: "Green coffee has been updated",
                                });
                                setIsEditDialogOpen(false);
                                setSelectedCoffee(null);
                              }}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Green Coffee Inventory</CardTitle>
          <CardDescription>
            All available green coffee beans in stock
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Producer</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Current Stock (kg)</TableHead>
                <TableHead>Arrival Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {olderCoffees.map((coffee) => (
                <TableRow key={coffee.id}>
                  <TableCell>
                    <Link
                      to={`/coffee/${coffee.id}`}
                      className="text-blue-500 hover:underline font-medium"
                    >
                      {coffee.name}
                    </Link>
                  </TableCell>
                  <TableCell>{coffee.producer}</TableCell>
                  <TableCell>{coffee.country}</TableCell>
                  <TableCell>{coffee.currentStock}</TableCell>
                  <TableCell>{formatDate(coffee.createdAt || "")}</TableCell>
                  <TableCell>
                    <Dialog open={isEditDialogOpen && selectedCoffee?.id === coffee.id} 
                      onOpenChange={(open) => {
                        setIsEditDialogOpen(open);
                        if (!open) setSelectedCoffee(null);
                      }}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedCoffee(coffee);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px]">
                        {selectedCoffee && (
                          <GreenCoffeeForm
                            coffee={selectedCoffee}
                            onSuccess={() => {
                              toast({
                                title: "Coffee Updated",
                                description: "Green coffee has been updated",
                              });
                              setIsEditDialogOpen(false);
                              setSelectedCoffee(null);
                            }}
                          />
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
