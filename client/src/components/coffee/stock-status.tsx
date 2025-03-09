import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockStatusProps {
  smallBags: number;
  largeBags: number;
  isVertical?: boolean;
  showWarning?: boolean;
  targetSmall?: number;
  targetLarge?: number;
}

export function StockStatus({
  smallBags,
  largeBags,
  isVertical = true,
  showWarning = true,
  targetSmall = 10,
  targetLarge = 5
}: StockStatusProps) {
  const isLowStock = (smallBags < targetSmall) || (largeBags < targetLarge);

  const stockStatusClasses = cn(
    "flex items-center gap-2",
    isVertical ? "flex-col items-end" : "flex-row items-center",
    isLowStock && showWarning && "text-red-500"
  );

  return (
    <div className={stockStatusClasses}>
      {isLowStock && showWarning && (
        <AlertTriangle className="h-4 w-4" />
      )}
      <div className="flex flex-col gap-1">
        <Badge variant={isLowStock && showWarning ? "destructive" : "secondary"}>
          Small: {smallBags}
        </Badge>
        <Badge variant={isLowStock && showWarning ? "destructive" : "secondary"}>
          Large: {largeBags}
        </Badge>
      </div>
    </div>
  );
}
