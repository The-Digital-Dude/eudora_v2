"use client";

import * as React from "react";
import { Cell, Label, Pie, PieChart } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export const description = "Platform-wide attendance status breakdown";

const chartData = [
  { status: "present", students: 1548, fill: "var(--color-present)" },
  { status: "late", students: 122, fill: "var(--color-late)" },
  { status: "absent", students: 96, fill: "var(--color-absent)" },
  { status: "excused", students: 76, fill: "var(--color-excused)" },
];

const chartConfig = {
  students: {
    label: "Students",
  },
  present: {
    label: "Present",
    color: "var(--success)",
  },
  late: {
    label: "Late",
    color: "var(--warning)",
  },
  absent: {
    label: "Absent",
    color: "var(--destructive)",
  },
  excused: {
    label: "Excused",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function ChartDonutAttendance() {
  const total = React.useMemo(
    () => chartData.reduce((sum, item) => sum + item.students, 0),
    [],
  );
  const presentRate = React.useMemo(
    () => Math.round((chartData[0].students / total) * 100),
    [total],
  );

  return (
    <Card className="@container/card flex flex-col">
      <CardHeader>
        <CardTitle>Attendance Status</CardTitle>
        <CardDescription>Today, across all campuses</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[220px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="students"
              nameKey="status"
              innerRadius={64}
              outerRadius={92}
              strokeWidth={2}
              stroke="var(--card)"
              isAnimationActive={false}
            >
              {chartData.map((entry) => (
                <Cell key={entry.status} fill={entry.fill} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {presentRate}%
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 22}
                          className="fill-muted-foreground text-xs"
                        >
                          Present
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
              />
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="status" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
