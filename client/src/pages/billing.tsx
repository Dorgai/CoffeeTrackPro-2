import { BillingEventGrid } from "@/components/billing/billing-event-grid";

export default function BillingPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing Management</h1>
          <p className="text-muted-foreground">
            Manage billing events and revenue splits
          </p>
        </div>
      </div>

      <BillingEventGrid />
    </div>
  );
}
