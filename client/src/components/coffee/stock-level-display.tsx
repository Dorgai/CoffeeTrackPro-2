import { RetailInventory } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface StockLevelDisplayProps {
  inventory: RetailInventory[];
  desiredSmallBags?: number;
  desiredLargeBags?: number;
}

export function StockLevelDisplay({ 
  inventory, 
  desiredSmallBags = 100, 
  desiredLargeBags = 50 
}: StockLevelDisplayProps) {
  const getTotalBags = () => {
    return inventory.reduce(
      (acc, item) => ({
        smallBags: acc.smallBags + (item.smallBags || 0),
        largeBags: acc.largeBags + (item.largeBags || 0),
      }),
      { smallBags: 0, largeBags: 0 }
    );
  };

  const { smallBags, largeBags } = getTotalBags();
  const smallBagsPercentage = Math.min((smallBags / desiredSmallBags) * 100, 100);
  const largeBagsPercentage = Math.min((largeBags / desiredLargeBags) * 100, 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Levels</CardTitle>
        <CardDescription>Current inventory vs desired levels</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Small Bags (200g)</span>
            <span className="text-sm text-muted-foreground">
              {smallBags} / {desiredSmallBags}
            </span>
          </div>
          <Progress 
            value={smallBagsPercentage} 
            className="h-2"
            indicatorClassName={smallBagsPercentage < 50 ? "bg-destructive" : ""}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Large Bags (1kg)</span>
            <span className="text-sm text-muted-foreground">
              {largeBags} / {desiredLargeBags}
            </span>
          </div>
          <Progress 
            value={largeBagsPercentage}
            className="h-2"
            indicatorClassName={largeBagsPercentage < 50 ? "bg-destructive" : ""}
          />
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Inventory by Coffee Type</h4>
          <div className="space-y-4">
            {inventory.map((item) => (
              <div key={item.coffeeId} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">{item.coffeeName}</span>
                  <span className="text-sm text-muted-foreground">
                    {item.smallBags || 0} small / {item.largeBags || 0} large
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
