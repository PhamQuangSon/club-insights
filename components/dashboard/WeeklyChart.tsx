"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { METRIC_COPY } from "@/lib/definitions";
import { formatCount, formatDateRange, formatShortDate, plural } from "@/lib/format";
import type { WeeklyPoint, WeeklyResponse } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

/** Reads design tokens at runtime so chart colours have one source of truth (globals.css). */
function useTokenColors() {
  const [colors, setColors] = useState({
    current: "hsl(239 98% 60%)",
    previous: "hsl(239 98% 82%)",
    grid: "hsl(222 44% 92%)",
    axis: "hsl(215 14% 34%)",
    hover: "hsl(221 100% 96%)",
  });
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const token = (name: string) => `hsl(${css.getPropertyValue(`--${name}`).trim()})`;
    setColors({
      current: token("chart-current"),
      previous: token("chart-previous"),
      grid: token("border"),
      axis: token("muted-foreground"),
      hover: token("muted"),
    });
  }, []);
  return colors;
}

interface Props {
  weekly: WeeklyResponse;
  zoneCity: string;
}

export function WeeklyChart({ weekly, zoneCity }: Props) {
  const colors = useTokenColors();
  const copy = METRIC_COPY[weekly.metric];
  const hasPartial = weekly.weeks.some((w) => w.partial);
  const data = weekly.weeks.map((w) => ({ ...w, label: formatShortDate(w.weekStart) }));

  return (
    <section aria-labelledby="weekly-title" className="rounded-xl border border-border bg-card p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div>
          <h2 id="weekly-title" className="text-lg font-bold">
            {copy.label} per week
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Each pair of bars is one Monday–Sunday week in {zoneCity}, next to the matching week of the previous period.
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground" aria-label="Legend">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-sm bg-chart-current" />
            This period · {formatDateRange(weekly.range)}
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-sm bg-chart-previous" />
            Previous · {formatDateRange(weekly.previousRange)}
          </li>
        </ul>
      </div>

      <div className="mt-5 h-[240px] md:h-[300px]" role="img" aria-label={`${copy.label} per week, bar chart. Table below.`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }} barGap={2} barCategoryGap="22%">
            <defs>
              {/* Partial weeks: 45° stripes in the series colour (texture, not a different hue). */}
              <pattern id="partial-week" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" fill={colors.current} fillOpacity={0.25} />
                <rect width="3" height="6" fill={colors.current} />
              </pattern>
            </defs>
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: colors.grid }}
              tick={{ fill: colors.axis, fontSize: 12 }}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: colors.axis, fontSize: 12 }}
              width={44}
            />
            <Tooltip
              cursor={{ fill: colors.hover }}
              content={({ active, payload }) => <WeekTooltip active={active} point={payload?.[0]?.payload} unit={copy.unit} />}
            />
            <Bar dataKey="previousValue" name="Previous period" fill={colors.previous} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
            <Bar dataKey="value" name="This period" fill={colors.current} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
              {data.map((w) => (
                <Cell key={w.weekStart} fill={w.partial ? "url(#partial-week)" : colors.current} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {hasPartial && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden className="size-2.5 shrink-0 rounded-sm partial-swatch" />
          Striped bars are partial weeks: only the days inside the range count, compared with the same days one period earlier.
        </p>
      )}

      <details className="group mt-4 border-t border-dashed border-border pt-3">
        <summary className="cursor-pointer text-sm font-semibold text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Show as table
        </summary>
        <WeeklyTable weeks={weekly.weeks} unit={copy.unit} />
      </details>
    </section>
  );
}

function WeekTooltip({ active, point, unit }: { active?: boolean; point?: unknown; unit: [string, string] }) {
  const week = point as WeeklyPoint | undefined;
  if (!active || !week) return null;
  const value = (n: number | null) => (n === null ? "unknown" : `${formatCount(n)} ${plural(n, unit)}`);
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-[13px] shadow-sm">
      <p className="font-bold">Week of {formatDateRange({ from: week.weekStart, to: week.weekEnd })}</p>
      <p className="mt-1.5 flex items-center gap-1.5">
        <span aria-hidden className={week.partial ? "size-2.5 rounded-sm partial-swatch" : "size-2.5 rounded-sm bg-chart-current"} />
        <span className="font-semibold tabular-nums">{value(week.value)}</span>
        {week.partial && <span className="text-muted-foreground">· partial week</span>}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
        <span aria-hidden className="size-2.5 rounded-sm bg-chart-previous" />
        <span className="tabular-nums">{value(week.previousValue)}</span> · {formatDateRange(week.previous)}
      </p>
    </div>
  );
}

function WeeklyTable({ weeks, unit }: { weeks: WeeklyPoint[]; unit: [string, string] }) {
  const show = (n: number | null) => (n === null ? "Unknown" : formatCount(n));
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="py-2 pr-4 font-bold">Week</th>
            <th className="py-2 pr-4 text-right font-bold">This period</th>
            <th className="py-2 pr-4 font-bold">Compared with</th>
            <th className="py-2 text-right font-bold">Previous</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {weeks.map((w) => (
            <tr key={w.weekStart} className="border-t border-border">
              <td className="py-2 pr-4">
                {formatDateRange({ from: w.weekStart, to: w.weekEnd })}
                {w.partial && <span className="ml-1.5 text-xs text-muted-foreground">partial</span>}
              </td>
              <td className="py-2 pr-4 text-right font-semibold">{show(w.value)}</td>
              <td className="py-2 pr-4 text-muted-foreground">{formatDateRange(w.previous)}</td>
              <td className="py-2 text-right text-muted-foreground">{show(w.previousValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="sr-only">Values are {unit[1]} per week.</p>
    </div>
  );
}

export function WeeklyChartSkeleton() {
  return <Skeleton className="h-[380px] rounded-xl md:h-[440px]" />;
}
