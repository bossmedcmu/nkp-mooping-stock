import React, { useState } from 'react';
import { ENTITLEMENT_FIELDS } from '../utils/dataNormalizer.js';

export default function TimeReportSection({ byDay, byMonth, byQuarter, byFiscalYear }) {
  const [periodTab, setPeriodTab] = useState('day');

  const rows =
    periodTab === 'day'
      ? byDay
      : periodTab === 'month'
        ? byMonth
        : periodTab === 'quarter'
          ? byQuarter
          : byFiscalYear;

  return (
    <div className="pastel-card p-3 p-md-4 mb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="h5 fw-bold mb-1">
            <i className="bi bi-calendar3 text-accent me-2" />
            รายงานแยกตามช่วงเวลา (รายวัน / รายเดือน / รายไตรมาส / รายปีงบประมาณ)
          </h2>
          <p className="small text-muted-theme mb-0">
            ปีงบประมาณคำนวณตามรอบ 1 ตุลาคม – 30 กันยายน (อ้างอิงเวลาประเทศไทย)
          </p>
        </div>

        <div className="btn-group btn-group-sm" role="group">
          <button
            type="button"
            className={`btn rounded-start-pill ${
              periodTab === 'day' ? 'btn-pastel-primary' : 'btn-pastel-soft'
            }`}
            onClick={() => setPeriodTab('day')}
          >
            รายวัน ({byDay.length})
          </button>
          <button
            type="button"
            className={`btn ${
              periodTab === 'month' ? 'btn-pastel-primary' : 'btn-pastel-soft'
            }`}
            onClick={() => setPeriodTab('month')}
          >
            รายเดือน ({byMonth.length})
          </button>
          <button
            type="button"
            className={`btn ${
              periodTab === 'quarter' ? 'btn-pastel-primary' : 'btn-pastel-soft'
            }`}
            onClick={() => setPeriodTab('quarter')}
          >
            รายไตรมาส ({byQuarter.length})
          </button>
          <button
            type="button"
            className={`btn rounded-end-pill ${
              periodTab === 'fy' ? 'btn-pastel-primary' : 'btn-pastel-soft'
            }`}
            onClick={() => setPeriodTab('fy')}
          >
            รายปีงบ ({byFiscalYear.length})
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle table-pastel mb-0">
          <thead>
            <tr>
              <th>ช่วงเวลา</th>
              <th className="text-end">รพ.สต. (แห่ง)</th>
              <th className="text-end">ครั้ง</th>
              <th className="text-end">Lab (ราย)</th>
              <th className="text-end">ยา (ราย)</th>
              <th className="text-end">รวมทั้งหมด (ราย)</th>
              {ENTITLEMENT_FIELDS.map((f) => (
                <th key={f.key} className="text-end small">
                  {f.shortLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={14} className="text-center py-4 text-muted-theme">
                  ไม่พบข้อมูลในช่วงเวลาที่เลือก
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const key = row.dateKey || row.monthKey || row.quarterKey || row.fiscalYear;
                const label =
                  row.dateLabel || row.fullLabel || row.label;
                return (
                  <tr key={key}>
                    <td className="fw-semibold">{label}</td>
                    <td className="text-end">{row.unitCount}</td>
                    <td className="text-end">{row.totalSessions}</td>
                    <td className="text-end">{row.labPatients.toLocaleString()}</td>
                    <td className="text-end">{row.drugPatients.toLocaleString()}</td>
                    <td className="text-end fw-bold text-accent">
                      {row.totalPatients.toLocaleString()}
                    </td>
                    {ENTITLEMENT_FIELDS.map((f) => (
                      <td key={f.key} className="text-end small">
                        {row.entitlements[f.key] ? row.entitlements[f.key].toLocaleString() : '-'}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
