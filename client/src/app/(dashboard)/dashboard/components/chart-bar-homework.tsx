"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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

export const description = "Weekly homework submission status by day";

const chartData = [
  { day: "Mon", submitted: 142, late: 18, missing: 9 },
  { day: "Tue", submitted: 156, late: 12, missing: 6 },
  { day: "Wed", submitted: 138, late: 22, missing: 14 },
  { day: "Thu", submitted: 164, late: 9, missing: 5 },
  { day: "Fri", submitted: 121, late: 27, missing: 19 },
];

const chartConfig = {
  submitted: {
    label: "Submitted on time",
    color: "var(--success)",
  },
  late: {
    label: "Submitted late",
    color: "var(--warning)",
  },
  missing: {
    label: "Missing",
    color: "var(--destructive)",
  },
} satisfies ChartConfig;

export function ChartBarHomework() {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Homework Submission Status</CardTitle>
        <CardDescription>Assignments due this week, by weekday</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <BarChart data={chartData} barCategoryGap="20%" barGap={2}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            <Bar
              dataKey="submitted"
              fill="var(--color-submitted)"
              fillOpacity={0.75}
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
              isAnimationActive={false}
            />
            <Bar
              dataKey="late"
              fill="var(--color-late)"
              fillOpacity={0.75}
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
              isAnimationActive={false}
            />
            <Bar
              dataKey="missing"
              fill="var(--color-missing)"
              fillOpacity={0.75}
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
              isAnimationActive={false}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
