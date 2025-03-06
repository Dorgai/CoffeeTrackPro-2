import { Progress } from "@/components/ui/progress";

interface StockProgressProps {
  current: number;
  desired: number;
  label: string;
}

export default function StockProgress({ current, desired, label }: StockProgressProps) {
  const percentage = Math.min(Math.round((current / desired) * 100), 100);

  // Determine color based on percentage
  const getProgressColor = () => {
    if (percentage >= 75) return "bg-emerald-500";
    if (percentage >= 50) return "bg-amber-500";
    return "bg-destructive";
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className={percentage < 50 ? "text-destructive font-medium" : ""}>
          {current} / {desired}
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