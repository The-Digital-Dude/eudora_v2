"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export const description = "Enrolled students by campus";

const chartData = [
  { campus: "Main Campus", students: 742 },
  { campus: "North Campus", students: 486 },
  { campus: "Online Programs", students: 398 },
  { campus: "South Annex", students: 216 },
]
  .slice()
  .sort((a, b) => b.students - a.students);

const chartConfig = {
  students: {
    label: "Students",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ChartBarEnrollment() {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Enrollment by Campus</CardTitle>
        <CardDescription>Currently enrolled students, all programs</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
          <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" hide />
            <YAxis
              dataKey="campus"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={128}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Bar
              dataKey="students"
              fill="var(--color-students)"
              fillOpacity={0.75}
              radius={[0, 4, 4, 0]}
              maxBarSize={24}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="students"
                position="right"
                className="fill-foreground"
                fontSize={11}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
