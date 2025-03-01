import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function Reports() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Default to last month
    const lastMonth = subMonths(new Date(), 1);
    return format(lastMonth, "yyyy-MM");
  });

  // Generate list of months for past 5 years
  const availableMonths = Array.from({ length: 60 }, (_, i) => {
    const date = subMonths(new Date(), i + 1);
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy")
    };
  });

  // Fetch monthly report data
  const { data: report, isLoading } = useQuery({
    queryKey: ["/api/reports/monthly", selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split("-");
      const startDate = startOfMonth(new Date(Number(year), Number(month) - 1));
      const endDate = endOfMonth(startDate);

      const res = await apiRequest("GET", `/api/reports/monthly?start=${format(startDate, "yyyy-MM-dd")}&end=${format(endDate, "yyyy-MM-dd")}`);
      if (!res.ok) {
        throw new Error("Failed to fetch monthly report");
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

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Monthly Reports</h1>
        <p className="text-muted-foreground">
          View detailed monthly reports for up to 5 years back
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Monthly Report</CardTitle>
              <CardDescription>Select a month to view detailed statistics</CardDescription>
            </div>
            <Select
              value={selectedMonth}
              onValueChange={setSelectedMonth}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map(month => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {report ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{report.totalOrders}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Small Bags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{report.totalSmallBags}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Large Bags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{report.totalLargeBags}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Shop-wise breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Shop Performance</CardTitle>
                  <CardDescription>Order statistics by shop location</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.shopStats.map((shop: any) => (
                      <div key={shop.id} className="space-y-2">
                        <h3 className="font-medium">{shop.name}</h3>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="text-sm">
                            Orders: <span className="font-medium">{shop.orders}</span>
                          </div>
                          <div className="text-sm">
                            Small Bags: <span className="font-medium">{shop.smallBags}</span>
                          </div>
                          <div className="text-sm">
                            Large Bags: <span className="font-medium">{shop.largeBags}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Coffee-wise breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Coffee Performance</CardTitle>
                  <CardDescription>Order statistics by coffee type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.coffeeStats.map((coffee: any) => (
                      <div key={coffee.id} className="space-y-2">
                        <h3 className="font-medium">{coffee.name}</h3>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="text-sm">
                            Orders: <span className="font-medium">{coffee.orders}</span>
                          </div>
                          <div className="text-sm">
                            Small Bags: <span className="font-medium">{coffee.smallBags}</span>
                          </div>
                          <div className="text-sm">
                            Large Bags: <span className="font-medium">{coffee.largeBags}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No data available for selected month
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
