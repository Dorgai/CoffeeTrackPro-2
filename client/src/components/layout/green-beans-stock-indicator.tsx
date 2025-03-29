import { useQuery } from "@tanstack/react-query";
import { greenCoffee } from "@shared/schema";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Coffee, Loader2 } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

type GreenCoffee = typeof greenCoffee.$inferSelect;

export function GreenBeansStockIndicator() {
  const { toast } = useToast();

  // Fetch green coffee data
  const { data: coffees, isLoading } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/green-coffee");
        if (!response.ok) {
          throw new Error("Failed to fetch green coffee data");
        }
        return response.json();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        throw error;
      }
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (!coffees || coffees.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Coffee className="h-4 w-4" />
        <span className="text-sm font-medium">No data</span>
      </div>
    );
  }

  // Calculate total current stock and target stock
  const totalCurrentStock = coffees.reduce((sum, coffee) => sum + Number(coffee.currentStock), 0);
  const totalTargetStock = coffees.reduce((sum, coffee) => sum + Number(coffee.minThreshold), 0);

  // Calculate stock level percentage (allow it to go over 100% if we have more than target)
  const stockPercentage = Math.round((totalCurrentStock / totalTargetStock) * 100);
  const displayPercentage = Math.min(stockPercentage, 999); // Cap display at 999% to avoid layout issues

  // Determine color based on percentage
  const getProgressColor = () => {
    if (stockPercentage >= 150) return "bg-blue-500"; // Overstocked
    if (stockPercentage >= 100) return "bg-green-500"; // Good stock level
    if (stockPercentage >= 75) return "bg-green-500";
    if (stockPercentage >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer">
          <Coffee className="h-4 w-4" />
          <div className="flex items-center gap-1">
            <span className={`text-sm font-medium ${stockPercentage < 50 ? 'text-red-500' : ''}`}>
              {displayPercentage}%
            </span>
            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${getProgressColor()}`}
                style={{ width: `${Math.min(stockPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Green Coffee Stock Level</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Current Stock:</p>
              <p className="font-medium">{totalCurrentStock.toFixed(2)}kg</p>
            </div>
            <div>
              <p className="text-muted-foreground">Target Stock:</p>
              <p className="font-medium">{totalTargetStock.toFixed(2)}kg</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Based on configured target stock levels
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}