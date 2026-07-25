"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardAction,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";

export const description = "Daily active learners and lessons completed";

// Deterministic dummy data — same shape as before, seeded so it's stable across renders.
function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

const rand = seededRandom(42);

const chartData = Array.from({ length: 91 }, (_, i) => {
  const date = new Date("2024-04-01");
  date.setDate(date.getDate() + i);
  const weekday = date.getDay();
  const isWeekend = weekday === 0 || weekday === 6;
  const base = isWeekend ? 120 : 340;
  const activeLearners = Math.round(base + rand() * 180 - 90);
  const lessonsCompleted = Math.round(activeLearners * (0.7 + rand() * 0.5));
  return {
    date: date.toISOString().split("T")[0],
    activeLearners: Math.max(20, activeLearners),
    lessonsCompleted: Math.max(15, lessonsCompleted),
  };
});

const chartConfig = {
  engagement: {
    label: "Engagement",
  },
  activeLearners: {
    label: "Active Learners",
    color: "var(--chart-1)",
  },
  lessonsCompleted: {
    label: "Lessons Completed",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function ChartAreaInteractive() {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState("90d");

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d");
    }
  }, [isMobile]);

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date);
    const referenceDate = new Date("2024-06-30");
    let daysToSubtract = 90;
    if (timeRange === "30d") {
      daysToSubtract = 30;
    } else if (timeRange === "7d") {
      daysToSubtract = 7;
    }
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    return date >= startDate;
  });

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Platform Engagement</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Active learners and lessons completed across all campuses
          </span>
          <span className="@[540px]/card:hidden">Active learners &amp; lessons completed</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillActiveLearners" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-activeLearners)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--color-activeLearners)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillLessonsCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-lessonsCompleted)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--color-lessonsCompleted)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value as string | number | Date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="lessonsCompleted"
              type="natural"
              fill="url(#fillLessonsCompleted)"
              stroke="var(--color-lessonsCompleted)"
              strokeWidth={2}
            />
            <Area
              dataKey="activeLearners"
              type="natural"
              fill="url(#fillActiveLearners)"
              stroke="var(--color-activeLearners)"
              strokeWidth={2}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
