import React, { useMemo, useState } from 'react';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  Tooltip,
} from 'chart.js';
import { Chart, Bar, Scatter } from 'react-chartjs-2';
import {
  buildRawRecordsCsv,
  buildUnitSummaryCsv,
  downloadCsvFile,
} from '../utils/csvExporter.js';
import { formatThaiDate } from '../utils/thaiTime.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  Tooltip,
  Legend
);

function formatGrowthBadge(pct) {
  if (pct === null || pct === undefined) {
    return { text: 'รอข้อมูลเปรียบเทียบ ≥ 2 ช่วง', cls: 'bg-secondary-subtle text-secondary-emphasis' };
  }
  if (pct > 0) {
    return { text: `+${pct}%`, cls: 'bg-success-subtle text-success-emphasis' };
  }
  if (pct < 0) {
    return { text: `${pct}%`, cls: 'bg-danger-subtle text-danger-emphasis' };
  }
  return { text: '0.0%', cls: 'bg-info-subtle text-info-emphasis' };
}

export default function DeepAnalyticsSection({ analytics, colorMode, onSelectUnit }) {
  const [heatmapView, setHeatmapView] = useState('weekday'); // 'weekday' | 'unitMonth'

  const deep = analytics.deepAnalytics;
  const textColor = colorMode === 'dark' ? '#f9d5e5' : '#4a304d';
  const gridColor = colorMode === 'dark' ? 'rgba(244,114,182,0.12)' : 'rgba(244,114,182,0.16)';

  const momBadge = formatGrowthBadge(deep.growthMetrics.momTotalPct);
  const qoqBadge = formatGrowthBadge(deep.growthMetrics.qoqTotalPct);

  // Pareto 80/20 Chart Data (Top 15 units for clarity)
  const paretoDisplay = useMemo(
    () => deep.paretoUnits.slice(0, 15),
    [deep.paretoUnits]
  );

  const paretoChartData = useMemo(
    () => ({
      labels: paretoDisplay.map((u) => u.unitName),
      datasets: [
        {
          type: 'line',
          label: 'สัดส่วนสะสม (%)',
          data: paretoDisplay.map((u) => u.cumulativePct),
          borderColor: '#f59e0b',
          backgroundColor: '#f59e0b',
          borderWidth: 2.5,
          tension: 0.25,
          yAxisID: 'y1',
          pointRadius: 3.5,
        },
        {
          type: 'bar',
          label: 'ผู้รับบริการ (ราย)',
          data: paretoDisplay.map((u) => u.totalPatients),
          backgroundColor: paretoDisplay.map((u) =>
            u.isCore80 ? 'rgba(236, 72, 153, 0.85)' : 'rgba(148, 163, 184, 0.55)'
          ),
          borderRadius: 6,
          yAxisID: 'y',
        },
      ],
    }),
    [paretoDisplay]
  );

  // Entitlement Comparison (Lab vs Drug)
  const entCompChartData = useMemo(() => {
    const items = deep.entitlementComparison.items;
    return {
      labels: items.map((i) => i.shortLabel),
      datasets: [
        {
          label: 'ส่งตรวจ Lab (ราย)',
          data: items.map((i) => i.labCount),
          backgroundColor: 'rgba(236, 72, 153, 0.82)',
          borderRadius: 6,
        },
        {
          label: 'เบิกยา รพ.สต. (ราย)',
          data: items.map((i) => i.drugCount),
          backgroundColor: 'rgba(14, 165, 233, 0.82)',
          borderRadius: 6,
        },
      ],
    };
  }, [deep.entitlementComparison.items]);

  // Scatter Plot (Sessions vs Avg Patients/Session)
  const scatterData = useMemo(() => {
    const byTier = { A: [], B: [], C: [] };
    for (const pt of deep.unitTiers.scatterPoints) {
      byTier[pt.tier].push(pt);
    }
    return {
      datasets: [
        {
          label: 'Tier A (ภาระงานสูง)',
          data: byTier.A,
          backgroundColor: 'rgba(236, 72, 153, 0.88)',
          pointRadius: 7,
          pointHoverRadius: 9,
        },
        {
          label: 'Tier B (ภาระงานปานกลาง)',
          data: byTier.B,
          backgroundColor: 'rgba(139, 92, 246, 0.82)',
          pointRadius: 6,
          pointHoverRadius: 8,
        },
        {
          label: 'Tier C (ภาระงานน้อย)',
          data: byTier.C,
          backgroundColor: 'rgba(56, 189, 248, 0.78)',
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    };
  }, [deep.unitTiers.scatterPoints]);

  function handleExportUnitCsv() {
    const csv = buildUnitSummaryCsv(analytics.byUnit);
    downloadCsvFile(csv, 'summary-by-unit-nkp.csv');
  }

  function handleExportRawCsv() {
    const csv = buildRawRecordsCsv(analytics.filtered);
    downloadCsvFile(csv, 'records-filtered-nkp.csv');
  }

  function getHeatmapBg(val, maxVal) {
    if (!val || !maxVal) return 'transparent';
    const ratio = Math.min(1, val / maxVal);
    const alpha = (0.12 + ratio * 0.68).toFixed(2);
    return `rgba(236, 72, 153, ${alpha})`;
  }

  if (analytics.filtered.length === 0) {
    return (
      <div className="pastel-card p-5 text-center text-muted-theme">
        <i className="bi bi-compass fs-1 text-accent d-block mb-2" />
        <div className="fw-semibold">ยังไม่มีข้อมูลสำหรับวิเคราะห์เชิงลึกในตัวกรองปัจจุบัน</div>
        <div className="small mt-1">กรุณาปรับตัวกรองด้านบนหรือกด "ดึงข้อมูลล่าสุด"</div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      {/* Export Toolbar */}
      <div className="pastel-card p-3 mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <h2 className="h5 fw-bold mb-0">
            <i className="bi bi-compass-fill text-accent me-2" />
            โมดูลวิเคราะห์ข้อมูลเชิงลึก (Deep Analytics)
          </h2>
          <div className="small text-muted-theme">
            เจาะลึกความเข้มข้นภาระงาน อัตราเติบโต สัดส่วนสิทธิ และความทันเวลาในการบันทึกข้อมูล
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-sm btn-pastel-soft px-3" onClick={handleExportUnitCsv}>
            <i className="bi bi-file-earmark-spreadsheet me-1" />
            ส่งออกสรุปราย รพ.สต. (CSV)
          </button>
          <button type="button" className="btn btn-sm btn-pastel-primary px-3" onClick={handleExportRawCsv}>
            <i className="bi bi-download me-1" />
            ส่งออกรายการตามตัวกรอง (CSV)
          </button>
        </div>
      </div>

      {/* 4 Deep KPI Cards */}
      <div className="row g-3 mb-3">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="pastel-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small fw-semibold text-muted-theme">เทียบเดือนก่อนหน้า (MoM)</span>
              <span className={`badge rounded-pill ${momBadge.cls}`}>{momBadge.text}</span>
            </div>
            <div className="fw-bold fs-5 font-display">
              {deep.growthMetrics.latestMonthLabel || '-'}
            </div>
            <div className="small text-muted-theme mt-1">
              {deep.growthMetrics.prevMonthLabel
                ? `เทียบ ${deep.growthMetrics.prevMonthLabel} | Lab ${deep.growthMetrics.momLabPct ?? '-'}% / ยา ${deep.growthMetrics.momDrugPct ?? '-'}%`
                : 'มีข้อมูลเพียง 1 เดือนในตัวกรองนี้'}
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="pastel-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small fw-semibold text-muted-theme">เทียบไตรมาสก่อนหน้า (QoQ)</span>
              <span className={`badge rounded-pill ${qoqBadge.cls}`}>{qoqBadge.text}</span>
            </div>
            <div className="fw-bold fs-5 font-display">
              {deep.growthMetrics.latestQuarterLabel || '-'}
            </div>
            <div className="small text-muted-theme mt-1">
              {deep.growthMetrics.prevQuarterLabel
                ? `เทียบ ${deep.growthMetrics.prevQuarterLabel} | Lab ${deep.growthMetrics.qoqLabPct ?? '-'}% / ยา ${deep.growthMetrics.qoqDrugPct ?? '-'}%`
                : 'มีข้อมูลเพียง 1 ไตรมาสในตัวกรองนี้'}
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="pastel-card p-3 h-100">
            <div className="small fw-semibold text-muted-theme mb-1">กฎ Pareto 80/20 (ความกระจุกตัว)</div>
            <div className="d-flex align-items-baseline gap-2">
              <span className="fs-3 fw-bold font-display text-accent">
                {deep.paretoSummary.coreUnitCount}
              </span>
              <span className="small text-muted-theme">
                จาก {deep.paretoSummary.totalUnitCount} แห่ง
              </span>
            </div>
            <div className="small text-muted-theme mt-1">
              สร้างปริมาณผู้รับบริการหลักถึง {deep.paretoSummary.coreSharePct}% ของทั้งเครือข่าย
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="pastel-card p-3 h-100">
            <div className="small fw-semibold text-muted-theme mb-1">ความทันเวลาการบันทึกข้อมูล</div>
            <div className="d-flex align-items-baseline gap-2">
              <span className="fs-3 fw-bold font-display text-success">
                {deep.dataQuality.onTimeWithin1DayPct}%
              </span>
              <span className="small text-muted-theme">บันทึกภายใน 1 วัน</span>
            </div>
            <div className="small text-muted-theme mt-1">
              ตรงวันจริง {deep.dataQuality.onTimeSameDayPct}% | เฉลี่ยล่าช้า {deep.dataQuality.avgLagDays} วัน
            </div>
          </div>
        </div>
      </div>

      {/* Pareto 80/20 + Entitlement Comparison */}
      <div className="row g-3 mb-3">
        <div className="col-12 col-lg-7">
          <div className="pastel-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h3 className="h6 fw-bold mb-0">
                <i className="bi bi-bar-chart-steps text-accent me-2" />
                กราฟ Pareto 80/20 รายหน่วยบริการ (15 อันดับแรก — คลิกแท่งเพื่อเจาะลึก)
              </h3>
            </div>
            <div style={{ height: 300 }}>
              <Chart
                type="bar"
                data={paretoChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { labels: { color: textColor, font: { family: 'Noto Sans Thai, sans-serif', size: 11 } } },
                  },
                  scales: {
                    x: {
                      ticks: { color: textColor, font: { family: 'Noto Sans Thai, sans-serif', size: 10 } },
                      grid: { color: gridColor },
                    },
                    y: {
                      type: 'linear',
                      position: 'left',
                      beginAtZero: true,
                      ticks: { color: textColor },
                      grid: { color: gridColor },
                    },
                    y1: {
                      type: 'linear',
                      position: 'right',
                      min: 0,
                      max: 100,
                      ticks: { color: '#f59e0b', callback: (v) => `${v}%` },
                      grid: { drawOnChartArea: false },
                    },
                  },
                  onClick: (_, elements) => {
                    if (elements && elements.length > 0 && onSelectUnit) {
                      const unit = paretoDisplay[elements[0].index];
                      if (unit) onSelectUnit(unit.unitName);
                    }
                  },
                }}
              />
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="pastel-card p-3 h-100">
            <h3 className="h6 fw-bold mb-1">
              <i className="bi bi-shield-plus text-accent me-2" />
              เปรียบเทียบสิทธิการรักษา 8 กลุ่ม (Lab vs เบิกยา)
            </h3>
            <div className="small text-muted-theme mb-2">
              กลุ่มสิทธิบัตรทอง (UC 3 เครือข่าย) รวม {deep.entitlementComparison.ucBreakdown.ucTotal.toLocaleString()} ราย ({deep.entitlementComparison.ucBreakdown.ucSharePct}%)
            </div>
            <div style={{ height: 280 }}>
              <Bar
                data={entCompChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  plugins: {
                    legend: { labels: { color: textColor, font: { family: 'Noto Sans Thai, sans-serif', size: 11 } } },
                  },
                  scales: {
                    x: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } },
                    y: { ticks: { color: textColor, font: { family: 'Noto Sans Thai, sans-serif', size: 11 } }, grid: { color: gridColor } },
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Unit Tiering & Scatter Plot */}
      <div className="row g-3 mb-3">
        <div className="col-12 col-lg-6">
          <div className="pastel-card p-3 h-100">
            <h3 className="h6 fw-bold mb-1">
              <i className="bi bi-bullseye text-accent me-2" />
              ความสัมพันธ์ความถี่ vs ความเข้มข้นต่อครั้ง (Scatter)
            </h3>
            <div className="small text-muted-theme mb-2">
              แกน X = จำนวนครั้งที่ดำเนินการ | แกน Y = เฉลี่ยผู้รับบริการต่อครั้ง (ราย/ครั้ง)
            </div>
            <div style={{ height: 270 }}>
              <Scatter
                data={scatterData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { labels: { color: textColor, font: { family: 'Noto Sans Thai, sans-serif', size: 11 } } },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => {
                          const raw = ctx.raw;
                          return `${raw.unitName}: ${raw.x} ครั้ง, เฉลี่ย ${raw.y} ราย/ครั้ง (รวม ${raw.totalPatients.toLocaleString()} ราย)`;
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      title: { display: true, text: 'จำนวนครั้งที่ดำเนินการ', color: textColor },
                      beginAtZero: true,
                      ticks: { color: textColor },
                      grid: { color: gridColor },
                    },
                    y: {
                      title: { display: true, text: 'เฉลี่ยราย/ครั้ง', color: textColor },
                      beginAtZero: true,
                      ticks: { color: textColor },
                      grid: { color: gridColor },
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="pastel-card p-3 h-100">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
              <h3 className="h6 fw-bold mb-0">
                <i className="bi bi-layers-fill text-accent me-2" />
                การจัดระดับภาระงานหน่วยบริการ (Tier A / B / C)
              </h3>
              <div className="d-flex gap-1">
                <span className="badge rounded-pill bg-danger-subtle text-danger-emphasis">
                  A: {deep.unitTiers.tierCounts.A}
                </span>
                <span className="badge rounded-pill bg-primary-subtle text-primary-emphasis">
                  B: {deep.unitTiers.tierCounts.B}
                </span>
                <span className="badge rounded-pill bg-info-subtle text-info-emphasis">
                  C: {deep.unitTiers.tierCounts.C}
                </span>
              </div>
            </div>
            <div className="table-responsive" style={{ maxHeight: 275 }}>
              <table className="table table-sm table-hover table-pastel align-middle mb-0 small">
                <thead>
                  <tr>
                    <th>หน่วยบริการ</th>
                    <th className="text-center">ระดับ</th>
                    <th className="text-end">ครั้ง</th>
                    <th className="text-end">เฉลี่ย/ครั้ง</th>
                    <th className="text-end">รวม (ราย)</th>
                  </tr>
                </thead>
                <tbody>
                  {deep.unitTiers.units.map((u) => (
                    <tr
                      key={u.unitName}
                      style={{ cursor: onSelectUnit ? 'pointer' : 'default' }}
                      onClick={() => onSelectUnit && onSelectUnit(u.unitName)}
                    >
                      <td className="fw-semibold">{u.unitName}</td>
                      <td className="text-center">
                        <span
                          className={`badge rounded-pill ${
                            u.tier === 'A'
                              ? 'bg-danger-subtle text-danger-emphasis'
                              : u.tier === 'B'
                                ? 'bg-primary-subtle text-primary-emphasis'
                                : 'bg-info-subtle text-info-emphasis'
                          }`}
                        >
                          Tier {u.tier}
                        </span>
                      </td>
                      <td className="text-end">{u.totalSessions}</td>
                      <td className="text-end">{u.avgPatientsPerSession}</td>
                      <td className="text-end fw-bold">{u.totalPatients.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Workload Heatmaps */}
      <div className="pastel-card p-3 mb-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h3 className="h6 fw-bold mb-0">
              <i className="bi bi-grid-3x3-gap-fill text-accent me-2" />
              ตารางความหนาแน่นภาระงาน (Workload Heatmap)
            </h3>
            <div className="small text-muted-theme">
              สีเข้มขึ้นแสดงถึงปริมาณผู้รับบริการที่หนาแน่นกว่าในช่วงนั้น
            </div>
          </div>
          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className={`btn rounded-start-pill ${heatmapView === 'weekday' ? 'btn-pastel-primary' : 'btn-pastel-soft'}`}
              onClick={() => setHeatmapView('weekday')}
            >
              วันในสัปดาห์ × ลักษณะบริการ
            </button>
            <button
              type="button"
              className={`btn rounded-end-pill ${heatmapView === 'unitMonth' ? 'btn-pastel-primary' : 'btn-pastel-soft'}`}
              onClick={() => setHeatmapView('unitMonth')}
            >
              รพ.สต. อันดับต้น × เดือน
            </button>
          </div>
        </div>

        {heatmapView === 'weekday' ? (
          <div className="table-responsive">
            <table className="table table-sm table-bordered table-pastel align-middle mb-0 small">
              <thead>
                <tr>
                  <th>วัน</th>
                  {deep.weekdayModeMatrix.modes.map((m) => (
                    <th key={m} className="text-center">
                      {m}
                    </th>
                  ))}
                  <th className="text-end">รวมวัน (ราย)</th>
                </tr>
              </thead>
              <tbody>
                {deep.weekdayModeMatrix.rows.map((row) => (
                  <tr key={row.dayIndex}>
                    <td className="fw-semibold text-nowrap">{row.label}</td>
                    {deep.weekdayModeMatrix.modes.map((m) => {
                      const cell = row.cells[m] || { patients: 0, sessions: 0 };
                      return (
                        <td
                          key={m}
                          className="text-center heatmap-cell"
                          style={{
                            backgroundColor: getHeatmapBg(
                              cell.patients,
                              deep.weekdayModeMatrix.maxCellPatients
                            ),
                          }}
                          title={`${row.label} - ${m}: ${cell.patients} ราย (${cell.sessions} ครั้ง)`}
                        >
                          {cell.patients > 0 ? (
                            <>
                              <div className="fw-bold">{cell.patients.toLocaleString()}</div>
                              <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{cell.sessions} ครั้ง</div>
                            </>
                          ) : (
                            <span className="text-muted-theme">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-end fw-bold">{row.totalPatients.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-bordered table-pastel align-middle mb-0 small">
              <thead>
                <tr>
                  <th>หน่วยบริการ (Top 12)</th>
                  {deep.unitMonthMatrix.months.map((m) => (
                    <th key={m.monthKey} className="text-center text-nowrap">
                      {m.label}
                    </th>
                  ))}
                  <th className="text-end">รวม (ราย)</th>
                </tr>
              </thead>
              <tbody>
                {deep.unitMonthMatrix.rows.map((row) => (
                  <tr key={row.unitName}>
                    <td className="fw-semibold">{row.unitName}</td>
                    {deep.unitMonthMatrix.months.map((m) => {
                      const val = row.cells[m.monthKey] || 0;
                      return (
                        <td
                          key={m.monthKey}
                          className="text-center heatmap-cell"
                          style={{
                            backgroundColor: getHeatmapBg(val, deep.unitMonthMatrix.maxCellPatients),
                          }}
                        >
                          {val > 0 ? <strong>{val.toLocaleString()}</strong> : <span className="text-muted-theme">-</span>}
                        </td>
                      );
                    })}
                    <td className="text-end fw-bold">{row.totalPatients.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Data Quality & Timeliness */}
      <div className="row g-3">
        <div className="col-12 col-lg-7">
          <div className="pastel-card p-3 h-100">
            <h3 className="h6 fw-bold mb-1">
              <i className="bi bi-clock-history text-accent me-2" />
              ดัชนีความทันเวลาในการบันทึกข้อมูลรายหน่วยบริการ
            </h3>
            <div className="small text-muted-theme mb-2">
              เปรียบเทียบวันที่ประทับเวลาบันทึกกับวันที่ดำเนินการจริง (สูงสุด {deep.dataQuality.maxLagDays} วัน)
            </div>
            <div className="table-responsive" style={{ maxHeight: 260 }}>
              <table className="table table-sm table-hover table-pastel align-middle mb-0 small">
                <thead>
                  <tr>
                    <th>หน่วยบริการ</th>
                    <th className="text-end">ครั้ง</th>
                    <th className="text-end">ทันเวลา ≤1 วัน</th>
                    <th className="text-end">เฉลี่ยล่าช้า (วัน)</th>
                    <th className="text-end">เกิน 1 วัน</th>
                  </tr>
                </thead>
                <tbody>
                  {deep.dataQuality.lagByUnit.map((lu) => (
                    <tr key={lu.unitName}>
                      <td className="fw-semibold">{lu.unitName}</td>
                      <td className="text-end">{lu.sessions}</td>
                      <td className="text-end">{lu.onTimeWithin1DayPct}%</td>
                      <td className="text-end">{lu.avgLagDays}</td>
                      <td className="text-end">
                        {lu.delayedSessions > 0 ? (
                          <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis">
                            {lu.delayedSessions} ครั้ง
                          </span>
                        ) : (
                          <span className="text-success">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="pastel-card p-3 h-100">
            <h3 className="h6 fw-bold mb-2">
              <i className="bi bi-clipboard2-check text-accent me-2" />
              ตรวจสอบความสอดคล้องของยอดรวม 8 สิทธิ
            </h3>
            {deep.dataQuality.mismatchRecords.length === 0 ? (
              <div
                className="p-3 rounded-4 text-center small"
                style={{ background: 'var(--bg-surface-soft)', border: '1px solid var(--border-soft)' }}
              >
                <i className="bi bi-check-circle-fill text-success fs-3 d-block mb-1" />
                <div className="fw-semibold">ยอดรวมทุกแถวตรงกับผลรวม 8 สิทธิครบ 100%</div>
                <div className="text-muted-theme mt-1">
                  ไม่พบรายการที่ตัวเลขผลรวมคลาดเคลื่อนในตัวกรองปัจจุบัน
                </div>
              </div>
            ) : (
              <div className="table-responsive" style={{ maxHeight: 240 }}>
                <table className="table table-sm table-pastel align-middle mb-0 small">
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>หน่วยบริการ</th>
                      <th className="text-end">ยอดกรอก</th>
                      <th className="text-end">ผลรวม 8 สิทธิ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deep.dataQuality.mismatchRecords.map((m) => (
                      <tr key={m.id}>
                        <td className="text-nowrap">{formatThaiDate(m.operationDate, true)}</td>
                        <td>{m.unitName}</td>
                        <td className="text-end fw-bold text-danger">{m.reportedTotal}</td>
                        <td className="text-end">{m.computedTotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
