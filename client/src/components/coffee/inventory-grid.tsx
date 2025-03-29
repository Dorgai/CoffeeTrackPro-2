import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { greenCoffee } from "@shared/schema";
import { Loader2, PackagePlus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useActiveShop } from "@/hooks/use-active-shop";
import { ShopSelector } from "@/components/layout/shop-selector";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OrderForm } from "@/components/coffee/order-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { AlertTriangle } from "lucide-react";

type GreenCoffee = typeof greenCoffee.$inferSelect;

interface InventoryGridProps {
  coffees: GreenCoffee[];
}

export function InventoryGrid({
  coffees,
}: InventoryGridProps) {
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