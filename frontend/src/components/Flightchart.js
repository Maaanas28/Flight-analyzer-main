import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-title">Telemetry Update #{label}</p>
        {payload.map((entry) => (
          <p key={entry.dataKey} className="tooltip-item" style={{ color: entry.stroke || entry.color }}>
            {entry.name}: <strong>{entry.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function FlightChart({ data }) {
  if (!data || data.length < 2) {
    return (
      <div className="chart-placeholder">
        📊 Waiting for telemetry stream to initialize…
      </div>
    );
  }

  return (
    <div className="chart-wrapper">
      <p className="chart-title">
        📈 Live System Telemetry
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="colorAlt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7f00ff" stopOpacity={0.35}/>
              <stop offset="95%" stopColor="#7f00ff" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorSpd" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.35}/>
              <stop offset="95%" stopColor="#00f2fe" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 242, 254, 0.05)" />
          <XAxis
            dataKey="tick"
            tick={{ fill: '#8c8ca3', fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }}
            axisLine={{ stroke: 'rgba(0, 242, 254, 0.15)' }}
            tickLine={false}
          />
          <YAxis
            yAxisId="alt"
            tick={{ fill: '#a855f7', fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }}
            axisLine={false}
            tickLine={false}
            width={38}
            tickFormatter={(v) => {
              if (v == null || isNaN(v)) return '0 ft';
              if (v === 0) return '0 ft';
              if (v < 1000) return `${Math.round(v)} ft`;
              return `${(v / 1000).toFixed(0)}k ft`;
            }}
          />
          <YAxis
            yAxisId="spd"
            orientation="right"
            tick={{ fill: '#00f2fe', fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }}
            axisLine={false}
            tickLine={false}
            width={38}
            tickFormatter={(v) => {
              if (v == null || isNaN(v)) return '0 kts';
              return `${Math.round(v)} kts`;
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '10px', paddingTop: '6px', fontFamily: "'Share Tech Mono', monospace" }}
            formatter={(value) => <span style={{ color: '#8c8ca3', fontWeight: 500 }}>{value}</span>}
          />
          <Area
            yAxisId="alt"
            type="monotone"
            dataKey="altitude"
            name="Altitude (ft)"
            stroke="#a855f7"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorAlt)"
            activeDot={{ r: 4, fill: '#a855f7', stroke: '#fff', strokeWidth: 1 }}
          />
          <Area
            yAxisId="spd"
            type="monotone"
            dataKey="speed"
            name="Speed (kts)"
            stroke="#00f2fe"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorSpd)"
            activeDot={{ r: 4, fill: '#00f2fe', stroke: '#fff', strokeWidth: 1 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}