import { BillingEventGrid } from "@/components/billing/billing-event-grid";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
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

  // Only roasteryOwner can access billing
  if (!user || user.role !== "roasteryOwner") {
    return <Redirect to="/" />;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing Management</h1>
          <p className="text-muted-foreground">
            Manage billing events, pricing, and revenue splits
          </p>
        </div>
      </div>

      <BillingEventGrid />
    </div>
  );
}