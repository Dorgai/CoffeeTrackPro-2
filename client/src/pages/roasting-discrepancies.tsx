import { useAuth } from "@/hooks/use-auth";
import { InventoryDiscrepancyView } from "@/components/coffee/inventory-discrepancy-view";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function RoastingDiscrepancies() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Inventory Discrepancy Reports</CardTitle>
          <CardDescription>
            Review and manage discrepancies between dispatched and received coffee quantities
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="mt-6">
        <InventoryDiscrepancyView />
      </div>
    </div>
  );
}
