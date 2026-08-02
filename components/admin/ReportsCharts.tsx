"use client";

import * as React from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

interface AttendanceRow { month: string; guests: number; }
interface PopularGameRow { name: string; guests: number; }

export function ReportsCharts() {
  const [attendance, setAttendance] = React.useState<AttendanceRow[]>([]);
  const [popularGames, setPopularGames] = React.useState<PopularGameRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/admin/reports/attendance").then((r) => r.json()),
      fetch("/api/admin/reports/popular-games").then((r) => r.json()),
    ]).then(([a, p]) => {
      setAttendance(a.data ?? []);
      setPopularGames(p.data ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="font-body italic text-parchment-dark">Cargando…</p>;

  return (
    <div className="flex flex-col gap-8">
      <div className="surface-parchment p-6">
        <h2 className="font-label text-xs uppercase tracking-widest text-leather-light mb-4">Asistencia por mes</h2>
        <Line
          data={{
            labels: attendance.map((r) => r.month),
            datasets: [{ label: "Personas", data: attendance.map((r) => r.guests), borderColor: "#8b3a0f", backgroundColor: "rgba(139,58,15,0.15)", tension: 0.3 }],
          }}
          options={{ responsive: true, plugins: { legend: { display: false } } }}
        />
      </div>

      <div className="surface-parchment p-6">
        <h2 className="font-label text-xs uppercase tracking-widest text-leather-light mb-4">Juegos más populares</h2>
        <Bar
          data={{
            labels: popularGames.map((r) => r.name),
            datasets: [{ label: "Personas", data: popularGames.map((r) => r.guests), backgroundColor: "#4a6741" }],
          }}
          options={{ responsive: true, indexAxis: "y" as const, plugins: { legend: { display: false } } }}
        />
      </div>
    </div>
  );
}
