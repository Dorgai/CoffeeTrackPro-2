import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { DateRange } from "react-day-picker";
import { addDays, format, isWithinInterval, startOfDay, endOfDay } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Analytics() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [showSmallBags, setShowSmallBags] = useState(true);
  const [showLargeBags, setShowLargeBags] = useState(true);

  // Fetch orders data
  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/orders");
      if (!res.ok) {
        throw new Error("Failed to fetch orders");
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Filter orders by date range and bag types
  const filteredOrders = orders?.filter((order: any) => {
    const orderDate = new Date(order.createdAt);
    const isInRange = dateRange?.from && dateRange?.to
      ? isWithinInterval(orderDate, {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to),
        })
      : true;

    const hasBagType =
      (showSmallBags && order.smallBags > 0) ||
      (showLargeBags && order.largeBags > 0);

    return isInRange && hasBagType;
  });

  // Group orders by shop and calculate totals
  const shopStats = filteredOrders?.reduce((acc: any, order: any) => {
    const shopName = order.shop.name;
    if (!acc[shopName]) {
      acc[shopName] = {
        totalSmallBags: 0,
        totalLargeBags: 0,
        totalOrders: 0,
        ordersByDate: {},
      };
    }

    acc[shopName].totalSmallBags += order.smallBags;
    acc[shopName].totalLargeBags += order.largeBags;
    acc[shopName].totalOrders += 1;

    const dateKey = format(new Date(order.createdAt), "yyyy-MM-dd");
    if (!acc[shopName].ordersByDate[dateKey]) {
      acc[shopName].ordersByDate[dateKey] = {
        smallBags: 0,
        largeBags: 0,
      };
    }
    acc[shopName].ordersByDate[dateKey].smallBags += order.smallBags;
    acc[shopName].ordersByDate[dateKey].largeBags += order.largeBags;

    return acc;
  }, {});

  // Prepare data for the chart
  const chartData = Object.entries(shopStats || {}).map(([shopName, stats]: [string, any]) => {
    return Object.entries(stats.ordersByDate).map(([date, bags]: [string, any]) => ({
      date,
      shop: shopName,
      smallBags: showSmallBags ? bags.smallBags : 0,
      largeBags: showLargeBags ? bags.largeBags : 0,
    }));
  }).flat();

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Order Analytics</h1>
        <p className="text-muted-foreground">
          Analyze order patterns and trends across shops
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Select date range and bag types</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Date Range</Label>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                className="rounded-md border"
              />
            </div>
            <div className="space-y-2">
              <Label>Bag Types</Label>
              <div className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="smallBags"
                    checked={showSmallBags}
                    onCheckedChange={(checked) => setShowSmallBags(checked as boolean)}
                  />
                  <label htmlFor="smallBags">Small Bags</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="largeBags"
                    checked={showLargeBags}
                    onCheckedChange={(checked) => setShowLargeBags(checked as boolean)}
                  />
                  <label htmlFor="largeBags">Large Bags</label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Overview of orders by shop</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop</TableHead>
                  <TableHead className="text-right">Small Bags</TableHead>
                  <TableHead className="text-right">Large Bags</TableHead>
                  <TableHead className="text-right">Total Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(shopStats || {}).map(([shopName, stats]: [string, any]) => (
                  <TableRow key={shopName}>
                    <TableCell className="font-medium">{shopName}</TableCell>
                    <TableCell className="text-right">{stats.totalSmallBags}</TableCell>
                    <TableCell className="text-right">{stats.totalLargeBags}</TableCell>
                    <TableCell className="text-right">{stats.totalOrders}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Order Trends</CardTitle>
          <CardDescription>Order volumes over time by shop</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {showSmallBags && (
                  <Line
                    type="monotone"
                    dataKey="smallBags"
                    name="Small Bags"
                    stroke="#8884d8"
                  />
                )}
                {showLargeBags && (
                  <Line
                    type="monotone"
                    dataKey="largeBags"
                    name="Large Bags"
                    stroke="#82ca9d"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
