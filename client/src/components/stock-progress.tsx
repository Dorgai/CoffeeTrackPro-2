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
    if (percentage >= 75) return "bg-green-500";
    if (percentage >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className={percentage < 50 ? "text-red-500 font-medium" : ""}>{current} / {desired}</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full transition-all ${getProgressColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
