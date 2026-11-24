import React, { useMemo } from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

export default function ChartsSection({
  analytics,
  colorMode,
  onSelectUnit,
}) {
  const textColor = colorMode === 'dark' ? '#f9d5e5' : '#4a304d';
  const gridColor = colorMode === 'dark' ? 'rgba(244,114,182,0.12)' : 'rgba(244,114,182,0.16)';

  const commonOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor,
            font: { family: 'Noto Sans Thai, Prompt, sans-serif', size: 12 },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { family: 'Noto Sans Thai, sans-serif', size: 11 } },
          grid: { color: gridColor },
        },
        y: {
          ticks: { color: textColor, font: { family: 'Noto Sans Thai, sans-serif', size: 11 } },
          grid: { color: gridColor },
          beginAtZero: true,
        },
      },
    }),
    [textColor, gridColor]
  );

  // 1. Daily / Monthly Trend (use Daily if <= 1 month or show Monthly + Daily)
  const monthlyData = useMemo(() => {
    const rows = analytics.byMonth;
    return {
      labels: rows.map((m) => m.label),
      datasets: [
        {
          label: 'ส่งตรวจ Lab (ราย)',
          data: rows.map((m) => m.labPatients),
          backgroundColor: 'rgba(236, 72, 153, 0.78)',
          borderColor: '#ec4899',
          borderRadius: 8,
        },
        {
          label: 'เบิกยา รพ.สต. (ราย)',
          data: rows.map((m) => m.drugPatients),
          backgroundColor: 'rgba(56, 189, 248, 0.78)',
          borderColor: '#0ea5e9',
          borderRadius: 8,
        },
      ],
    };
  }, [analytics.byMonth]);

  // 2. Top 10 Units
  const topUnits = useMemo(() => analytics.byUnit.slice(0, 10), [analytics.byUnit]);
  const topUnitsData = useMemo(
    () => ({
      labels: topUnits.map((u) => u.unitName),
      datasets: [
        {
          label: 'Lab (ราย)',
          data: topUnits.map((u) => u.labPatients),
          backgroundColor: 'rgba(244, 114, 182, 0.85)',
          borderRadius: 6,
        },
        {
          label: 'เบิกยา (ราย)',
          data: topUnits.map((u) => u.drugPatients),
          backgroundColor: 'rgba(167, 139, 250, 0.85)',
          borderRadius: 6,
        },
      ],
    }),
    [topUnits]
  );

  // 3. Entitlement Doughnut
  const entitlementData = useMemo(() => {
    const active = analytics.entitlementSummary.filter((e) => e.count > 0);
    return {
      labels: active.map((e) => `${e.shortLabel} (${e.pct}%)`),
      datasets: [
        {
          data: active.map((e) => e.count),
          backgroundColor: active.map((e) => e.color),
          borderWidth: 2,
          borderColor: colorMode === 'dark' ? '#21192a' : '#ffffff',
        },
      ],
    };
  }, [analytics.entitlementSummary, colorMode]);

  // 4. Daily Trend (chronological)
  const dailyTrendData = useMemo(() => {
    const asc = [...analytics.byDay].reverse();
    return {
      labels: asc.map((d) => d.dateLabel),
      datasets: [
        {
          label: 'ผู้รับบริการรายวันรวม (ราย)',
          data: asc.map((d) => d.totalPatients),
          borderColor: '#ec4899',
          backgroundColor: 'rgba(244, 114, 182, 0.18)',
          tension: 0.32,
          fill: true,
          pointRadius: 3.5,
        },
      ],
    };
  }, [analytics.byDay]);

  // 5. Weekday Peak Analysis
  const weekdayData = useMemo(
    () => ({
      labels: analytics.byDayOfWeek.map((w) => w.label),
      datasets: [
        {
          label: 'Lab (ราย)',
          data: analytics.byDayOfWeek.map((w) => w.labPatients),
          backgroundColor: 'rgba(251, 113, 133, 0.82)',
          borderRadius: 6,
        },
        {
          label: 'เบิกยา (ราย)',
          data: analytics.byDayOfWeek.map((w) => w.drugPatients),
          backgroundColor: 'rgba(52, 211, 153, 0.82)',
          borderRadius: 6,
        },
      ],
    }),
    [analytics.byDayOfWeek]
  );

  return (
    <div className="row g-3 mb-4">
      {/* Monthly comparison */}
      <div className="col-12 col-lg-7">
        <div className="pastel-card p-3 h-100">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h3 className="h6 fw-bold mb-0">
              <i className="bi bi-bar-chart-line-fill text-accent me-2" />
              เปรียบเทียบปริมาณการสนับสนุนรายเดือน (Lab vs ยา)
            </h3>
          </div>
          <div style={{ height: 270 }}>
            <Bar data={monthlyData} options={commonOptions} />
          </div>
        </div>
      </div>

      {/* Entitlement mix */}
      <div className="col-12 col-lg-5">
        <div className="pastel-card p-3 h-100">
          <h3 className="h6 fw-bold mb-2">
            <i className="bi bi-pie-chart-fill text-accent me-2" />
            สัดส่วนสิทธิการรักษา 8 กลุ่ม
          </h3>
          <div style={{ height: 270 }}>
            <Doughnut
              data={entitlementData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: {
                      color: textColor,
                      boxWidth: 12,
                      font: { family: 'Noto Sans Thai, sans-serif', size: 11 },
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Top 10 Units */}
      <div className="col-12 col-lg-7">
        <div className="pastel-card p-3 h-100">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h3 className="h6 fw-bold mb-0">
              <i className="bi bi-trophy-fill text-accent me-2" />
              10 อันดับหน่วยบริการที่มีผู้รับบริการสูงสุด (คลิกแท่งกราฟเพื่อดูรายละเอียด)
            </h3>
          </div>
          <div style={{ height: 300 }}>
            <Bar
              data={topUnitsData}
              options={{
                ...commonOptions,
                indexAxis: 'y',
                scales: {
                  x: { ...commonOptions.scales.x, stacked: true },
                  y: { ...commonOptions.scales.y, stacked: true },
                },
                onClick: (_, elements) => {
                  if (elements && elements.length > 0 && onSelectUnit) {
                    const idx = elements[0].index;
                    const unit = topUnits[idx];
                    if (unit) onSelectUnit(unit.unitName);
                  }
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Weekday Peak */}
      <div className="col-12 col-lg-5">
        <div className="pastel-card p-3 h-100">
          <h3 className="h6 fw-bold mb-2">
            <i className="bi bi-calendar2-week-fill text-accent me-2" />
            ความหนาแน่นภาระงานตามวันในสัปดาห์
          </h3>
          <div style={{ height: 300 }}>
            <Bar
              data={weekdayData}
              options={{
                ...commonOptions,
                scales: {
                  x: { ...commonOptions.scales.x, stacked: true },
                  y: { ...commonOptions.scales.y, stacked: true },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Daily Trend */}
      <div className="col-12">
        <div className="pastel-card p-3">
          <h3 className="h6 fw-bold mb-2">
            <i className="bi bi-activity text-accent me-2" />
            แนวโน้มยอดผู้รับบริการรายวันตามวันที่ดำเนินการ
          </h3>
          <div style={{ height: 230 }}>
            <Line data={dailyTrendData} options={commonOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
