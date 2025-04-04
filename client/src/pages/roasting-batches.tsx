import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function RoastingBatches() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Roasting Batches</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Batch
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Batches</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No roasting batches found.</p>
        </CardContent>
      </Card>
    </div>
  );
} 