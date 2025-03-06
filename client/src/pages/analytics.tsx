import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { DateRange } from "react-day-picker";
import { addDays, format, isWithinInterval, startOfDay, endOfDay, subDays } from "date-fns";

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
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
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

  // Calculate the previous period date range
  const previousPeriodRange = dateRange?.from && dateRange?.to ? {
    from: subDays(dateRange.from, dateRange.to.getTime() - dateRange.from.getTime()),
    to: subDays(dateRange.to, dateRange.to.getTime() - dateRange.from.getTime()),
  } : undefined;

  // Filter orders by date range and bag types
  const filterOrdersByPeriod = (orders: any[], range?: DateRange) => {
    if (!range?.from || !range?.to) return [];

    return orders?.filter((order: any) => {
      const orderDate = new Date(order.createdAt);
      const isInRange = isWithinInterval(orderDate, {
        start: startOfDay(range.from),
        end: endOfDay(range.to),
      });

      const hasBagType =
        (showSmallBags && order.smallBags > 0) ||
        (showLargeBags && order.largeBags > 0);

      return isInRange && hasBagType;
    });
  };

  const currentPeriodOrders = filterOrdersByPeriod(orders, dateRange);
  const previousPeriodOrders = filterOrdersByPeriod(orders, previousPeriodRange);

  // Group orders by shop and calculate totals for both periods
  const calculateShopStats = (filteredOrders: any[]) => {
    return filteredOrders?.reduce((acc: any, order: any) => {
      // Handle missing shop data with a fallback
      const shopName = order.shop?.name || 'Unassigned';

      if (!acc[shopName]) {
        acc[shopName] = {
          totalSmallBags: 0,
          totalLargeBags: 0,
          totalOrders: 0,
          ordersByDate: {},
        };
      }

      acc[shopName].totalSmallBags += order.smallBags || 0;
      acc[shopName].totalLargeBags += order.largeBags || 0;
      acc[shopName].totalOrders += 1;

      const dateKey = format(new Date(order.createdAt), "yyyy-MM-dd");
      if (!acc[shopName].ordersByDate[dateKey]) {
        acc[shopName].ordersByDate[dateKey] = {
          smallBags: 0,
          largeBags: 0,
        };
      }
      acc[shopName].ordersByDate[dateKey].smallBags += order.smallBags || 0;
      acc[shopName].ordersByDate[dateKey].largeBags += order.largeBags || 0;

      return acc;
    }, {});
  };

  const currentShopStats = calculateShopStats(currentPeriodOrders);
  const previousShopStats = calculateShopStats(previousPeriodOrders);

  // Calculate percentage changes
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  // Prepare data for the chart
  const chartData = Object.entries(currentShopStats || {}).map(([shopName, stats]: [string, any]) => {
    return Object.entries(stats.ordersByDate).map(([date, bags]: [string, any]) => ({
      date,
      shop: shopName,
      smallBags: showSmallBags ? bags.smallBags : 0,
      largeBags: showLargeBags ? bags.largeBags : 0,
      // Add previous period data for comparison
      prevSmallBags: showSmallBags && previousShopStats[shopName]?.ordersByDate[date]?.smallBags || 0,
      prevLargeBags: showLargeBags && previousShopStats[shopName]?.ordersByDate[date]?.largeBags || 0,
    }));
  }).flat();

  const renderTrend = (change: number | null) => {
    if (change === null) return <Minus className="h-4 w-4" />;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4" />;
  };

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
            <CardDescription>Overview of orders by shop with period comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop</TableHead>
                  <TableHead className="text-right">Small Bags</TableHead>
                  <TableHead className="text-right">Large Bags</TableHead>
                  <TableHead className="text-right">Total Orders</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(currentShopStats || {}).map(([shopName, stats]: [string, any]) => {
                  const prevStats = previousShopStats[shopName];
                  const totalChange = calculateChange(
                    stats.totalOrders,
                    prevStats?.totalOrders || 0
                  );

                  return (
                    <TableRow key={shopName}>
                      <TableCell className="font-medium">{shopName}</TableCell>
                      <TableCell className="text-right">
                        {stats.totalSmallBags}
                        {prevStats && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({renderTrend(calculateChange(stats.totalSmallBags, prevStats.totalSmallBags))})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {stats.totalLargeBags}
                        {prevStats && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({renderTrend(calculateChange(stats.totalLargeBags, prevStats.totalLargeBags))})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{stats.totalOrders}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {renderTrend(totalChange)}
                          <span>{totalChange ? `${Math.abs(totalChange).toFixed(1)}%` : "-"}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Order Trends</CardTitle>
          <CardDescription>Order volumes over time by shop with previous period comparison</CardDescription>
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
                  <>
                    <Line
                      type="monotone"
                      dataKey="smallBags"
                      name="Small Bags (Current)"
                      stroke="#8884d8"
                    />
                    <Line
                      type="monotone"
                      dataKey="prevSmallBags"
                      name="Small Bags (Previous)"
                      stroke="#8884d8"
                      strokeDasharray="3 3"
                      opacity={0.5}
                    />
                  </>
                )}
                {showLargeBags && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="largeBags"
                      name="Large Bags (Current)"
                      stroke="#82ca9d"
                    />
                    <Line
                      type="monotone"
                      dataKey="prevLargeBags"
                      name="Large Bags (Previous)"
                      stroke="#82ca9d"
                      strokeDasharray="3 3"
                      opacity={0.5}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}