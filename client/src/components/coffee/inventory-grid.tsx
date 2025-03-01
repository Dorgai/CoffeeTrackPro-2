import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import type { GreenCoffee } from "@shared/schema";

export function InventoryGrid({
  coffees,
}: {
  coffees: GreenCoffee[];
}) {
  const [, navigate] = useLocation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Green Coffee Inventory</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Producer</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Current Stock (kg)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coffees.map((coffee) => (
              <TableRow key={coffee.id}>
                <TableCell className="font-medium">{coffee.name}</TableCell>
                <TableCell>{coffee.producer}</TableCell>
                <TableCell>{coffee.country}</TableCell>
                <TableCell>{coffee.currentStock.toString()}</TableCell>
                <TableCell>
                  {Number(coffee.currentStock) <= Number(coffee.minThreshold) ? (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Low Stock
                    </Badge>
                  ) : (
                    <Badge variant="secondary">In Stock</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/coffee/${coffee.id}`)}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}