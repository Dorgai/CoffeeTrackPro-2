import { BillingEventGrid } from "@/components/billing/billing-event-grid";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function BillingPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Allow both roasteryOwner and retailOwner to access billing
  if (!user || (user.role !== "roasteryOwner" && user.role !== "retailOwner")) {
    return <Redirect to="/" />;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing Management</h1>
          <p className="text-muted-foreground">
            {user.role === "roasteryOwner" 
              ? "Manage billing events, pricing, and revenue splits"
              : "View billing events and quantities"}
          </p>
        </div>
      </div>

      <BillingEventGrid />
    </div>
  );
}