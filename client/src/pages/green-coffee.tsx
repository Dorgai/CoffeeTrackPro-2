import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GreenCoffee } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { TargetEditorDialog } from "@/components/coffee/target-editor-dialog";

export function GreenCoffeePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCoffee, setSelectedCoffee] = useState<GreenCoffee | null>(null);

  const { data: coffees, isLoading } = useQuery<GreenCoffee[]>({
    queryKey: ["green-coffee"],
    queryFn: async () => {
      const response = await fetch("/api/green-coffee");
      if (!response.ok) {
        throw new Error("Failed to fetch green coffee");
      }
      return response.json();
    },
  });

  const filteredCoffees = coffees?.filter((coffee) =>
    coffee.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Green Coffee</h1>
        <Button>Add New Coffee</Button>
      </div>
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Search coffee..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCoffees?.map((coffee) => (
          <div
            key={coffee.id}
            className="rounded-lg border bg-card text-card-foreground shadow-sm"
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold">{coffee.name}</h3>
              <p className="text-sm text-muted-foreground">
                Producer: {coffee.producer}
              </p>
              <p className="text-sm text-muted-foreground">
                Country: {coffee.country}
              </p>
              <p className="text-sm text-muted-foreground">
                Current Stock: {coffee.currentStock} kg
              </p>
              <p className="text-sm text-muted-foreground">
                Grade: {coffee.grade}
              </p>
            </div>
            <div className="p-6 pt-0">
              <Button
                variant="outline"
                onClick={() => setSelectedCoffee(coffee)}
              >
                Set Target
              </Button>
            </div>
          </div>
        ))}
      </div>
      {selectedCoffee && (
        <TargetEditorDialog
          coffee={selectedCoffee}
          onClose={() => setSelectedCoffee(null)}
        />
      )}
    </div>
  );
} 