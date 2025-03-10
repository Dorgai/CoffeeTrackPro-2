import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GreenCoffee } from "@shared/schema";
import { Loader2, PackagePlus, RefreshCw, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useActiveShop } from "@/hooks/use-active-shop";
import { ShopSelector } from "@/components/layout/shop-selector";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderForm } from "@/components/coffee/order-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Link } from "wouter";
import { RetailInventoryTable } from "@/components/coffee/retail-inventory-table";
import { RestockDialog } from "@/components/coffee/restock-dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Retail() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeShop } = useActiveShop();
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isRestockDialogOpen, setIsRestockDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: coffees, isLoading: loadingCoffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
  });

  if (loadingCoffees) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Check if user can place orders and restock
  const canManageInventory = ["owner", "retailOwner", "shopManager", "barista"].includes(user?.role || "");

  // Filter coffees based on search query
  const filteredCoffees = coffees?.filter(coffee => 
    coffee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coffee.producer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coffee.grade.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group coffees by grade
  const groupedCoffees = filteredCoffees?.reduce((acc, coffee) => {
    const grade = coffee.grade || 'Other';
    if (!acc[grade]) {
      acc[grade] = [];
    }
    acc[grade].push(coffee);
    return acc;
  }, {} as Record<string, GreenCoffee[]>);

  const handleRestock = () => {
    if (!activeShop?.id) {
      toast({
        title: "Error",
        description: "Please select a shop first",
        variant: "destructive",
      });
      return;
    }
    setIsRestockDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Retail Management</h1>
            <p className="text-muted-foreground">
              Manage your shop's inventory and orders
            </p>
          </div>
          {canManageInventory && (
            <div className="flex gap-4">
              <Button variant="outline" asChild>
                <Link href="/retail/orders">View Orders</Link>
              </Button>
              <Button variant="outline" onClick={handleRestock}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Restock
              </Button>
              <Button onClick={() => setIsOrderDialogOpen(true)}>
                <PackagePlus className="h-4 w-4 mr-2" />
                Place Order
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <ShopSelector />
        </div>
      </div>

      {!activeShop?.id ? (
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
          Please select a shop to manage inventory.
        </div>
      ) : (
        <RetailInventoryTable />
      )}

      <Dialog
        open={isOrderDialogOpen}
        onOpenChange={setIsOrderDialogOpen}
      >
        <DialogContent className="sm:max-w-[600px]">
          <CardHeader>
            <CardTitle>Place New Order</CardTitle>
            <CardDescription>Select coffee and specify quantities to order from the roastery</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, producer, or grade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            {groupedCoffees && Object.keys(groupedCoffees).length > 0 ? (
              <ScrollArea className="h-[400px] pr-4">
                <Tabs defaultValue={Object.keys(groupedCoffees)[0]}>
                  <TabsList className="mb-4">
                    {Object.keys(groupedCoffees).map((grade) => (
                      <TabsTrigger key={grade} value={grade}>
                        {grade}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {Object.entries(groupedCoffees).map(([grade, gradeCoffees]) => (
                    <TabsContent key={grade} value={grade}>
                      <div className="space-y-4">
                        {gradeCoffees.map((coffee) => (
                          <Card key={coffee.id}>
                            <CardContent className="pt-6">
                              <OrderForm
                                coffee={coffee}
                                availableBags={{ smallBags: 0, largeBags: 0 }}
                                onSuccess={() => setIsOrderDialogOpen(false)}
                              />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No coffees found matching your search.
              </div>
            )}
          </CardContent>
        </DialogContent>
      </Dialog>

      <RestockDialog
        open={isRestockDialogOpen}
        onOpenChange={setIsRestockDialogOpen}
        shopId={activeShop?.id || null}
      />
    </div>
  );
}