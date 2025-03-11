import { Progress } from "@/components/ui/progress";

interface StockProgressProps {
  current: number;
  desired: number;
  label: string;
}

export default function StockProgress({ current, desired, label }: StockProgressProps) {
  // Calculate percentage of stock availability
  const percentage = Math.min(Math.round((current / desired) * 100), 100);

  // Determine color based on stock level percentage
  const getProgressColor = () => {
    if (percentage >= 75) return "bg-emerald-500"; // Healthy stock level
    if (percentage >= 50) return "bg-amber-500";   // Medium stock level
    return "bg-destructive";                       // Low stock level
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className={percentage < 50 ? "text-destructive font-medium" : ""}>
          {current} / {desired} ({percentage}%)
        </span>
      </div>
      <Progress 
        value={percentage}
        className="h-2"
        indicatorClassName={getProgressColor()}
      />
    </div>
  );
}