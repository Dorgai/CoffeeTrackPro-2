import { useQuery } from "@tanstack/react-query";
import { GreenCoffee } from "@shared/schema";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import { Coffee } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function GreenBeansStockIndicator() {
  const { toast } = useToast();

  // Fetch green coffee data using our standard query client
  const { data: coffees } = useQuery<GreenCoffee[]>({
    queryKey: ["/api/green-coffee"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/green-coffee");
        if (!response.ok) {
          throw new Error("Failed to fetch green coffee data");
        }
        const data = await response.json();
        return data;
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

  if (!coffees || coffees.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Coffee className="h-4 w-4" />
        <span className="text-sm font-medium">No data</span>
      </div>
    );
  }

  // Calculate total current stock
  const totalCurrentStock = coffees.reduce((sum, coffee) => sum + Number(coffee.currentStock), 0);

  // Calculate total desired stock based on min thresholds
  const totalDesiredStock = coffees.reduce((sum, coffee) => sum + Number(coffee.minThreshold), 0);

  // Calculate stock level percentage with a minimum of 0 and maximum of 100
  const stockPercentage = Math.min(Math.max(Math.round((totalCurrentStock / totalDesiredStock) * 100), 0), 100);

  // Determine stock level status and color
  const getStockClass = () => {
    if (stockPercentage < 50) return "bg-red-500";
    if (stockPercentage >= 75) return "bg-green-500";
    return "bg-yellow-500";
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer">
          <Coffee className="h-4 w-4" />
          <div className="flex items-center gap-1">
            <span className={`text-sm font-medium ${stockPercentage < 50 ? 'text-red-500' : ''}`}>
              {stockPercentage}%
            </span>
            <Progress 
              value={stockPercentage} 
              className={`w-24 h-2 ${getStockClass()}`}
            />
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
              <p className="font-medium">{totalDesiredStock.toFixed(2)}kg</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Stock Ratio: {totalCurrentStock.toFixed(2)}kg / {totalDesiredStock.toFixed(2)}kg
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}