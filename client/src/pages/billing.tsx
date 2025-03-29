import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { format, startOfDay, endOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

interface OrderQuantity {
  grade: string;
  totalSmallBags: number;
  totalLargeBags: number;
  orders: {
    id: number;
    shopName: string;
    smallBags: number;
    largeBags: number;
    orderDate: string;
    deliveryDate: string;
  }[];
}

interface SplitQuantities {
  [grade: string]: {
    percentage: number;
    smallBags: number;
    largeBags: number;
  };
}

type GradeType = 'Specialty' | 'Premium' | 'Rarity';

const GRADE_ORDER: Record<GradeType, number> = {
  'Specialty': 0,
  'Premium': 1,
  'Rarity': 2
};

export default function Billing() {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [splits, setSplits] = useState<SplitQuantities>({});

  const { data: quantities, isLoading } = useQuery<OrderQuantity[]>({
    queryKey: ["/api/billing/quantities", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) {
        const start = startOfDay(startDate);
        params.append("startDate", start.toISOString());
      }
      if (endDate) {
        const end = endOfDay(endDate);
        params.append("endDate", end.toISOString());
      }
      const response = await fetch(`/api/billing/quantities?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch billing quantities");
      return response.json();
    },
  });

  const handleSplitChange = (grade: string, value: string) => {
    const percentage = Math.min(100, Math.max(1, parseInt(value) || 70));
    const totalSmallBags = quantities?.find(q => q.grade === grade)?.totalSmallBags || 0;
    const totalLargeBags = quantities?.find(q => q.grade === grade)?.totalLargeBags || 0;
    
    setSplits(prev => ({
      ...prev,
      [grade]: {
        percentage,
        smallBags: Math.round(totalSmallBags * percentage / 100),
        largeBags: Math.round(totalLargeBags * percentage / 100)
      }
    }));
  };

  const getSplitValues = (grade: string) => {
    const split = splits[grade];
    if (!split) {
      const totalSmallBags = quantities?.find(q => q.grade === grade)?.totalSmallBags || 0;
      const totalLargeBags = quantities?.find(q => q.grade === grade)?.totalLargeBags || 0;
      return {
        percentage: 70,
        smallBags: Math.round(totalSmallBags * 0.7),
        largeBags: Math.round(totalLargeBags * 0.7)
      };
    }
    return split;
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const sortedQuantities = quantities?.sort((a, b) => {
    const orderA = GRADE_ORDER[a.grade as GradeType] ?? 999;
    const orderB = GRADE_ORDER[b.grade as GradeType] ?? 999;
    return orderA - orderB;
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Billing</h1>
        <div className="flex gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : "Start Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : "End Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid gap-6">
        {sortedQuantities?.map((gradeData) => {
          const split = getSplitValues(gradeData.grade);
          const totalSmallBags = gradeData.totalSmallBags;
          const totalLargeBags = gradeData.totalLargeBags;
          const remainingSmallBags = totalSmallBags - split.smallBags;
          const remainingLargeBags = totalLargeBags - split.largeBags;
          const remainingPercentage = 100 - split.percentage;

          return (
            <Card key={gradeData.grade}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{gradeData.grade}</span>
                  <div className="text-sm text-muted-foreground">
                    Total: {totalSmallBags} small bags, {totalLargeBags} large bags
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Split Percentage</TableHead>
                      <TableHead className="text-right">Small Bags</TableHead>
                      <TableHead className="text-right">Large Bags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={split.percentage}
                            onChange={(e) => handleSplitChange(gradeData.grade, e.target.value)}
                            className="w-20"
                          />
                          <span>%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{split.smallBags}</TableCell>
                      <TableCell className="text-right">{split.largeBags}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={remainingPercentage}
                            disabled
                            className="w-20 bg-muted"
                          />
                          <span>%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{remainingSmallBags}</TableCell>
                      <TableCell className="text-right">{remainingLargeBags}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 