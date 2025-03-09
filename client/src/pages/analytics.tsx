import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { DateRange } from "react-day-picker";
import { addDays, format, subDays, startOfDay } from "date-fns";

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
import { Button } from "@/components/ui/button";
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
  BarChart,
  Bar,
} from "recharts";

type DatePreset = {
  label: string;
  days: number;
};

const datePresets: DatePreset[] = [
  { label: "Last 7 Days", days: 7 },
  { label: "Last 14 Days", days: 14 },
  { label: "Last 30 Days", days: 30 },
  { label: "Last 90 Days", days: 90 },
];

export default function Analytics() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [showSmallBags, setShowSmallBags] = useState(true);
  const [showLargeBags, setShowLargeBags] = useState(true);

  const handlePresetClick = (days: number) => {
    const to = new Date();
    const from = subDays(to, days);
    setDateRange({ from, to });
  };

  // Fetch orders data
  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/orders", dateRange?.from, dateRange?.to],
    queryFn: async () => {
      const fromDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "";
      const toDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "";

      const res = await apiRequest(
        "GET", 
        `/api/orders?from=${fromDate}&to=${toDate}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch orders");
      }
      return res.json();
    },
    enabled: !!dateRange?.from && !!dateRange?.to,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Filter and group orders by shop and date
  const groupedOrders = orders?.reduce((acc: any, order: any) => {
    const shopName = order.shop?.name || 'Unassigned';
    const dateKey = format(new Date(order.createdAt), "yyyy-MM-dd");

    if (!acc[shopName]) {
      acc[shopName] = {
        totalSmallBags: 0,
        totalLargeBags: 0,
        totalOrders: 0,
        dailyStats: {},
      };
    }

    acc[shopName].totalSmallBags += order.smallBags || 0;
    acc[shopName].totalLargeBags += order.largeBags || 0;
    acc[shopName].totalOrders += 1;

    if (!acc[shopName].dailyStats[dateKey]) {
      acc[shopName].dailyStats[dateKey] = {
        smallBags: 0,
        largeBags: 0,
        orders: 0,
      };
    }

    acc[shopName].dailyStats[dateKey].smallBags += order.smallBags || 0;
    acc[shopName].dailyStats[dateKey].largeBags += order.largeBags || 0;
    acc[shopName].dailyStats[dateKey].orders += 1;

    return acc;
  }, {});

  // Prepare data for the charts
  const shopData = Object.entries(groupedOrders || {}).map(([shop, data]: [string, any]) => ({
    shop,
    smallBags: data.totalSmallBags,
    largeBags: data.totalLargeBags,
    totalOrders: data.totalOrders,
  }));

  // Prepare daily trend data
  const dailyTrendData = Object.entries(groupedOrders || {}).flatMap(([shop, data]: [string, any]) =>
    Object.entries(data.dailyStats).map(([date, stats]: [string, any]) => ({
      date,
      shop,
      smallBags: showSmallBags ? stats.smallBags : 0,
      largeBags: showLargeBags ? stats.largeBags : 0,
      orders: stats.orders,
    }))
  ).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Order Analytics</h1>
        <p className="text-muted-foreground">
          Analyze order patterns and trends across shops
        </p>
      </div>

      {/* Date Range Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
          <CardDescription>Select the period for analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Quick Select</h3>
                <div className="flex flex-wrap gap-2">
                  {datePresets.map((preset) => (
                    <Button
                      key={preset.days}
                      variant="outline"
                      onClick={() => handlePresetClick(preset.days)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <div className="text-lg font-medium">
                      {dateRange?.from ? format(dateRange.from, "MMM dd, yyyy") : "-"}
                    </div>
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <div className="text-lg font-medium">
                      {dateRange?.to ? format(dateRange.to, "MMM dd, yyyy") : "-"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bag Types to Display</Label>
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
            </div>
            <div>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                className="rounded-md border"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per Shop Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Shop Performance</CardTitle>
          <CardDescription>Order statistics by shop</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shopData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="shop" />
                <YAxis />
                <Tooltip />
                <Legend />
                {showSmallBags && (
                  <Bar dataKey="smallBags" name="Small Bags" fill="#8884d8" />
                )}
                {showLargeBags && (
                  <Bar dataKey="largeBags" name="Large Bags" fill="#82ca9d" />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Daily Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Trends</CardTitle>
          <CardDescription>Order volumes over time by shop</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrendData}>
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

      {/* Detailed Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Statistics</CardTitle>
          <CardDescription>Breakdown by shop and bag size</CardDescription>
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
              {Object.entries(groupedOrders || {}).map(([shop, data]: [string, any]) => (
                <TableRow key={shop}>
                  <TableCell className="font-medium">{shop}</TableCell>
                  <TableCell className="text-right">{data.totalSmallBags}</TableCell>
                  <TableCell className="text-right">{data.totalLargeBags}</TableCell>
                  <TableCell className="text-right">{data.totalOrders}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}