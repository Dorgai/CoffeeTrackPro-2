import { Progress } from "@/components/ui/progress";

interface StockProgressProps {
  current: number;
  desired: number;
  label: string;
}

export function StockProgress({ current, desired, label }: StockProgressProps) {
  const percentage = Math.min(Math.round((current / desired) * 100), 100);
  
  // Determine color based on percentage
  const getColorClass = () => {
    if (percentage >= 75) return "bg-green-500";
    if (percentage >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span>{percentage}% of target</span>
      </div>
      <Progress 
        value={percentage}
        className="h-2"
        indicatorClassName={getColorClass()}
      />
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Current: {current}</span>
        <span>Target: {desired}</span>
      </div>
    </div>
  );
}
