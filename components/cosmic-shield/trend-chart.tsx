"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VitalPoint } from "@/lib/rules/types";

export function TrendChart({
  hr,
  hrv,
  baselineMin = 58,
  baselineMax = 82,
}: {
  hr: VitalPoint[];
  hrv: VitalPoint[];
  baselineMin?: number;
  baselineMax?: number;
}) {
  const data = hr.map((p, i) => ({
    day: p.missionDay,
    hr: p.value,
    hrv: hrv[i]?.value ?? null,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
          <XAxis dataKey="day" stroke="#71717a" fontSize={11} />
          <YAxis stroke="#71717a" fontSize={11} />
          <Tooltip
            contentStyle={{ background: "#09090b", border: "1px solid #3f3f46", fontSize: 12 }}
          />
          <ReferenceArea y1={baselineMin} y2={baselineMax} fill="#06b6d4" fillOpacity={0.08} />
          <Line type="monotone" dataKey="hr" stroke="#22d3ee" strokeWidth={2} dot={false} name="HR" />
          <Line type="monotone" dataKey="hrv" stroke="#a78bfa" strokeWidth={2} dot={false} name="HRV" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
