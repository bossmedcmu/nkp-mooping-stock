import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { computeAnalytics } from '../utils/analyticsEngine.js';
import { ENTITLEMENT_FIELDS } from '../utils/dataNormalizer.js';
import { formatThaiDateTime } from '../utils/thaiTime.js';

const REPORT_TYPES = [
  { id: 'unit', label: 'ราย รพ.สต. / หน่วยบริการ' },
  { id: 'day', label: 'รายวัน' },
  { id: 'month', label: 'รายเดือน' },
  { id: 'quarter', label: 'รายไตรมาส' },
  { id: 'fy', label: 'รายปีงบประมาณ' },
];

export default function PrintReportPortal({
  isOpen,
  onClose,
  allRecords,
  selectedFiscalYear,
  fiscalYears,
  lastUpdatedLabel,
}) {
  const [reportType, setReportType] = useState('unit');
  const [scope, setScope] = useState('ALL'); // 'ALL' | 'lab' | 'drug'
  const [printFy, setPrintFy] = useState(selectedFiscalYear || 'ALL');
  const [includeInsights, setIncludeInsights] = useState(true);
  const [orientation, setOrientation] = useState('landscape'); // 'landscape' | 'portrait'
  const [detailLevel, setDetailLevel] = useState('full'); // 'full' | 'compact'

  useEffect(() => {
    setPrintFy(selectedFiscalYear || 'ALL');
  }, [selectedFiscalYear, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('print-portal-active');
    } else {
      document.body.classList.remove('print-portal-active');
    }
    return () => {
      document.body.classList.remove('print-portal-active');
    };
  }, [isOpen]);

  const printAnalytics = useMemo(() => {
    return computeAnalytics(allRecords, {
      fiscalYear: printFy,
      datasetMode: scope,
    });
  }, [allRecords, printFy, scope]);

  const normalizedRows = useMemo(() => {
    if (reportType === 'unit') {
      return printAnalytics.byUnit.map((u) => ({
        key: u.unitName,
        label: u.unitName,
        subLabel: u.serviceModesList.join(', '),
        sessions: u.totalSessions,
        labPatients: u.labPatients,
        drugPatients: u.drugPatients,
        totalPatients: u.totalPatients,
        entitlements: u.entitlements,
      }));
    }
    if (reportType === 'day') {
      return printAnalytics.byDay.map((d) => ({
        key: d.dateKey,
        label: d.dateLabel,
        subLabel: `${d.unitCount} แห่ง`,
        sessions: d.totalSessions,
        labPatients: d.labPatients,
        drugPatients: d.drugPatients,
        totalPatients: d.totalPatients,
        entitlements: d.entitlements,
      }));
    }
    if (reportType === 'month') {
      return printAnalytics.byMonth.map((m) => ({
        key: m.monthKey,
        label: m.fullLabel,
        subLabel: `${m.unitCount} แห่ง`,
        sessions: m.totalSessions,
        labPatients: m.labPatients,
        drugPatients: m.drugPatients,
        totalPatients: m.totalPatients,
        entitlements: m.entitlements,
      }));
    }
    if (reportType === 'quarter') {
      return printAnalytics.byQuarter.map((q) => ({
        key: q.quarterKey,
        label: q.label,
        subLabel: `${q.unitCount} แห่ง`,
        sessions: q.totalSessions,
        labPatients: q.labPatients,
        drugPatients: q.drugPatients,
        totalPatients: q.totalPatients,
        entitlements: q.entitlements,
      }));
    }
    return printAnalytics.byFiscalYear.map((fy) => ({
      key: String(fy.fiscalYear),
      label: fy.label,
      subLabel: `${fy.unitCount} แห่ง`,
      sessions: fy.totalSessions,
      labPatients: fy.labPatients,
      drugPatients: fy.drugPatients,
      totalPatients: fy.totalPatients,
      entitlements: fy.entitlements,
    }));
  }, [reportType, printAnalytics]);

  const columnTotals = useMemo(() => {
    const totals = {
      sessions: 0,
      labPatients: 0,
      drugPatients: 0,
      totalPatients: 0,
      ucTotal: 0,
      otherTotal: 0,
      entitlements: {},
    };
    for (const f of ENTITLEMENT_FIELDS) totals.entitlements[f.key] = 0;

    for (const r of normalizedRows) {
      totals.sessions += r.sessions;
      totals.labPatients += r.labPatients;
      totals.drugPatients += r.drugPatients;
      totals.totalPatients += r.totalPatients;
      const rowUc =
        (r.entitlements.ucNkp || 0) +
        (r.entitlements.ucMaesa || 0) +
        (r.entitlements.ucKhajao || 0);
      const rowOther = Math.max(0, r.totalPatients - rowUc);
      totals.ucTotal += rowUc;
      totals.otherTotal += rowOther;
      for (const f of ENTITLEMENT_FIELDS) {
        totals.entitlements[f.key] += r.entitlements[f.key] || 0;
      }
    }
    return totals;
  }, [normalizedRows]);

  if (!isOpen) return null;

  const safeOrientation = orientation === 'portrait' ? 'portrait' : 'landscape';
  const isPortrait = safeOrientation === 'portrait';
  const isCompact = detailLevel === 'compact';
  const activeReportMeta = REPORT_TYPES.find((t) => t.id === reportType);
  const scopeLabel =
    scope === 'ALL'
      ? 'รวมงานส่งสิ่งส่งตรวจ (Lab) และเบิกยา รพ.สต.'
      : scope === 'lab'
        ? 'เฉพาะรายการสนับสนุนส่งสิ่งส่งตรวจทางห้องปฏิบัติการ (Lab)'
        : 'เฉพาะทะเบียนเบิกยาที่ไม่มีใช้ใน รพ.สต.';

  const pageCssRule = `@page { size: A4 ${safeOrientation}; margin: ${isPortrait ? '9mm' : '10mm'}; }`;

  const content = (
    <div className="print-portal-overlay">
      <style>{pageCssRule}</style>

      {/* Toolbar (hidden on print) */}
      <div className="print-toolbar-card no-print">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h5 className="fw-bold mb-1">
              <i className="bi bi-printer-fill text-danger me-2" />
              ตั้งค่าพิมพ์รายงานสรุปผลการดำเนินงาน (ขนาด A4 {isPortrait ? 'แนวตั้ง' : 'แนวนอน'})
            </h5>
            <div className="small text-secondary">
              เลือกแนวการวางกระดาษ (แนวตั้ง/แนวนอน) และระดับความละเอียดของตารางได้อิสระ
            </div>
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-pastel-primary px-4"
              onClick={() => window.print()}
            >
              <i className="bi bi-printer me-2" />
              สั่งพิมพ์ / บันทึกเป็น PDF
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary rounded-pill px-3"
              onClick={onClose}
            >
              ปิด
            </button>
          </div>
        </div>

        <hr className="my-3" />

        <div className="row g-2 align-items-end">
          <div className="col-12 col-sm-6 col-lg-3">
            <label className="form-label small fw-semibold mb-1">รูปแบบรายงาน</label>
            <select
              className="form-select form-select-sm"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              {REPORT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-sm-6 col-lg-2">
            <label className="form-label small fw-semibold mb-1">ขอบเขตข้อมูล</label>
            <select
              className="form-select form-select-sm"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="ALL">รวม Lab + เบิกยา</option>
              <option value="lab">เฉพาะ Lab</option>
              <option value="drug">เฉพาะเบิกยา รพ.สต.</option>
            </select>
          </div>
          <div className="col-6 col-sm-6 col-lg-2">
            <label className="form-label small fw-semibold mb-1">ปีงบประมาณ</label>
            <select
              className="form-select form-select-sm"
              value={printFy}
              onChange={(e) => setPrintFy(e.target.value)}
            >
              <option value="ALL">ทุกปีงบประมาณ</option>
              {fiscalYears.map((fy) => (
                <option key={fy} value={String(fy)}>
                  ปีงบประมาณ {fy}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-sm-6 col-lg-2">
            <label className="form-label small fw-semibold mb-1">วางกระดาษ A4</label>
            <div className="btn-group btn-group-sm w-100" role="group" aria-label="เลือกแนวการวางกระดาษ">
              <button
                type="button"
                className={`btn ${orientation === 'landscape' ? 'btn-pastel-primary' : 'btn-pastel-soft'}`}
                onClick={() => setOrientation('landscape')}
              >
                <i className="bi bi-file-earmark-break me-1" />
                แนวนอน
              </button>
              <button
                type="button"
                className={`btn ${orientation === 'portrait' ? 'btn-pastel-primary' : 'btn-pastel-soft'}`}
                onClick={() => setOrientation('portrait')}
              >
                <i className="bi bi-file-earmark-text me-1" />
                แนวตั้ง
              </button>
            </div>
          </div>

          <div className="col-6 col-sm-6 col-lg-2">
            <label className="form-label small fw-semibold mb-1">ความละเอียดตาราง</label>
            <select
              className="form-select form-select-sm"
              value={detailLevel}
              onChange={(e) => setDetailLevel(e.target.value)}
            >
              <option value="full">ครบทั้ง 8 สิทธิ</option>
              <option value="compact">แบบสรุปย่อ (Lab–ยา–UC)</option>
            </select>
          </div>

          <div className="col-12 col-lg-1">
            <div className="form-check">
              <input
                id="chk-include-insights"
                className="form-check-input"
                type="checkbox"
                checked={includeInsights}
                onChange={(e) => setIncludeInsights(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="chk-include-insights">
                บทสรุป
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* A4 Sheet (Landscape or Portrait) */}
      <div className={isPortrait ? 'a4-sheet-portrait' : 'a4-sheet-landscape'}>
        <div className="d-flex justify-content-between align-items-start border-bottom border-2 pb-2 mb-3 gap-2">
          <div>
            <h2 className={`${isPortrait ? 'h6' : 'h5'} fw-bold mb-1`}>
              รายงานสรุปผลการดำเนินงานสนับสนุนเครือข่ายบริการปฐมภูมิ ({activeReportMeta?.label})
            </h2>
            <div className="small text-secondary" style={isPortrait ? { fontSize: '8.2pt' } : undefined}>
              ขอบเขต: {scopeLabel} | ปีงบประมาณ: {printFy === 'ALL' ? 'ทั้งหมด' : printFy} | ช่วงข้อมูล:{' '}
              {printAnalytics.summary.dateRangeStart} – {printAnalytics.summary.dateRangeEnd}
            </div>
          </div>
          <div className="text-end small text-secondary flex-shrink-0" style={isPortrait ? { fontSize: '8pt' } : undefined}>
            <div>อัปเดตข้อมูลล่าสุด: {lastUpdatedLabel}</div>
            <div>พิมพ์เมื่อ: {formatThaiDateTime(new Date())}</div>
          </div>
        </div>

        {/* Print KPI strip */}
        <div className="row g-2 mb-3">
          <div className="col-3">
            <div className="print-summary-box text-center">
              <div className="small text-secondary" style={isPortrait ? { fontSize: '8pt' } : undefined}>
                ผู้รับบริการรวม
              </div>
              <div className={`fw-bold ${isPortrait ? 'fs-6' : 'fs-5'}`}>
                {printAnalytics.summary.totalPatients.toLocaleString()} ราย
              </div>
            </div>
          </div>
          <div className="col-3">
            <div className="print-summary-box text-center">
              <div className="small text-secondary" style={isPortrait ? { fontSize: '8pt' } : undefined}>
                จำนวนครั้งสนับสนุน
              </div>
              <div className={`fw-bold ${isPortrait ? 'fs-6' : 'fs-5'}`}>
                {printAnalytics.summary.totalSessions.toLocaleString()} ครั้ง
              </div>
            </div>
          </div>
          <div className="col-3">
            <div className="print-summary-box text-center">
              <div className="small text-secondary" style={isPortrait ? { fontSize: '8pt' } : undefined}>
                ส่งตรวจ Lab / เบิกยา
              </div>
              <div className="fw-bold" style={isPortrait ? { fontSize: '9pt' } : undefined}>
                {printAnalytics.summary.labPatients.toLocaleString()} /{' '}
                {printAnalytics.summary.drugPatients.toLocaleString()} ราย
              </div>
            </div>
          </div>
          <div className="col-3">
            <div className="print-summary-box text-center">
              <div className="small text-secondary" style={isPortrait ? { fontSize: '8pt' } : undefined}>
                หน่วยบริการรับบริการ
              </div>
              <div className={`fw-bold ${isPortrait ? 'fs-6' : 'fs-5'}`}>
                {printAnalytics.summary.activeUnitsCount} แห่ง
              </div>
            </div>
          </div>
        </div>

        {/* Report Table */}
        {isCompact ? (
          <table className="a4-print-table mb-3">
            <thead>
              <tr>
                <th style={{ width: '5%' }}>ที่</th>
                <th style={{ width: '35%' }}>
                  {reportType === 'unit' ? 'รายชื่อ รพ.สต. / หน่วยบริการ' : 'ช่วงเวลา / วันที่'}
                </th>
                <th style={{ width: '8%' }}>ครั้ง</th>
                <th style={{ width: '10%' }}>Lab (ราย)</th>
                <th style={{ width: '10%' }}>ยา (ราย)</th>
                <th style={{ width: '11%' }}>กลุ่ม UC รวม</th>
                <th style={{ width: '10%' }}>สิทธิอื่นๆ</th>
                <th style={{ width: '11%' }}>รวม (ราย)</th>
              </tr>
            </thead>
            <tbody>
              {normalizedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-3">
                    ไม่มีข้อมูลในช่วงที่เลือก
                  </td>
                </tr>
              ) : (
                normalizedRows.map((row, idx) => {
                  const ucTotal =
                    (row.entitlements.ucNkp || 0) +
                    (row.entitlements.ucMaesa || 0) +
                    (row.entitlements.ucKhajao || 0);
                  const otherTotal = Math.max(0, row.totalPatients - ucTotal);
                  return (
                    <tr key={row.key}>
                      <td className="text-center">{idx + 1}</td>
                      <td>
                        <div className="fw-semibold">{row.label}</div>
                        {reportType !== 'unit' && (
                          <div style={{ fontSize: '7.5pt', color: '#64748b' }}>{row.subLabel}</div>
                        )}
                      </td>
                      <td className="text-end">{row.sessions.toLocaleString()}</td>
                      <td className="text-end">{row.labPatients.toLocaleString()}</td>
                      <td className="text-end">{row.drugPatients.toLocaleString()}</td>
                      <td className="text-end">{ucTotal.toLocaleString()}</td>
                      <td className="text-end">{otherTotal.toLocaleString()}</td>
                      <td className="text-end fw-bold">{row.totalPatients.toLocaleString()}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="text-center">
                  รวมทั้งหมด
                </td>
                <td className="text-end">{columnTotals.sessions.toLocaleString()}</td>
                <td className="text-end">{columnTotals.labPatients.toLocaleString()}</td>
                <td className="text-end">{columnTotals.drugPatients.toLocaleString()}</td>
                <td className="text-end">{columnTotals.ucTotal.toLocaleString()}</td>
                <td className="text-end">{columnTotals.otherTotal.toLocaleString()}</td>
                <td className="text-end">{columnTotals.totalPatients.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <table
            className={`a4-print-table mb-3 ${isPortrait ? 'a4-table-portrait-full' : ''}`}
          >
            <thead>
              <tr>
                <th style={{ width: '4%' }}>ที่</th>
                <th style={{ width: isPortrait ? '22%' : '21%' }}>
                  {reportType === 'unit' ? 'รายชื่อ รพ.สต. / หน่วยบริการ' : 'ช่วงเวลา / วันที่'}
                </th>
                <th style={{ width: isPortrait ? '5%' : '6%' }}>ครั้ง</th>
                <th style={{ width: isPortrait ? '6%' : '7%' }}>Lab</th>
                <th style={{ width: isPortrait ? '6%' : '7%' }}>ยา</th>
                {ENTITLEMENT_FIELDS.map((f) => (
                  <th key={f.key} style={{ width: '6%' }}>
                    {f.shortLabel}
                  </th>
                ))}
                <th style={{ width: isPortrait ? '9%' : '7%' }}>รวม</th>
              </tr>
            </thead>
            <tbody>
              {normalizedRows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-3">
                    ไม่มีข้อมูลในช่วงที่เลือก
                  </td>
                </tr>
              ) : (
                normalizedRows.map((row, idx) => (
                  <tr key={row.key}>
                    <td className="text-center">{idx + 1}</td>
                    <td>
                      <div className="fw-semibold">{row.label}</div>
                      {reportType !== 'unit' && (
                        <div style={{ fontSize: isPortrait ? '6.6pt' : '7.5pt', color: '#64748b' }}>
                          {row.subLabel}
                        </div>
                      )}
                    </td>
                    <td className="text-end">{row.sessions.toLocaleString()}</td>
                    <td className="text-end">{row.labPatients.toLocaleString()}</td>
                    <td className="text-end">{row.drugPatients.toLocaleString()}</td>
                    {ENTITLEMENT_FIELDS.map((f) => (
                      <td key={f.key} className="text-end">
                        {row.entitlements[f.key] ? row.entitlements[f.key].toLocaleString() : '-'}
                      </td>
                    ))}
                    <td className="text-end fw-bold">{row.totalPatients.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="text-center">
                  รวมทั้งหมด
                </td>
                <td className="text-end">{columnTotals.sessions.toLocaleString()}</td>
                <td className="text-end">{columnTotals.labPatients.toLocaleString()}</td>
                <td className="text-end">{columnTotals.drugPatients.toLocaleString()}</td>
                {ENTITLEMENT_FIELDS.map((f) => (
                  <td key={f.key} className="text-end">
                    {columnTotals.entitlements[f.key].toLocaleString()}
                  </td>
                ))}
                <td className="text-end">{columnTotals.totalPatients.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        )}

        {/* Insights & Next-step recommendations */}
        {includeInsights && (
          <div
            className="print-summary-box mb-3"
            style={{ fontSize: isPortrait ? '8pt' : '8.8pt' }}
          >
            <div className="fw-bold mb-1">สรุปผลการวิเคราะห์และแนวทางการดำเนินงานครั้งต่อไป</div>
            <div className="mb-1">{printAnalytics.insights.executiveParagraph}</div>
            {printAnalytics.insights.recommendations.slice(0, 3).map((rec, i) => (
              <div key={rec.id} className="mt-1">
                <strong>
                  {i + 1}. {rec.category}:
                </strong>{' '}
                {rec.action}
              </div>
            ))}
          </div>
        )}

        {/* Signature Block */}
        <div
          className={`print-signature-grid ${isPortrait ? 'is-portrait' : ''}`}
          style={{ fontSize: isPortrait ? '8.2pt' : '9pt' }}
        >
          <div className="text-center">
            <div>ลงชื่อ .................................................... ผู้จัดทำรายงาน</div>
            <div className="mt-1">(....................................................)</div>
            <div className="text-secondary">วันที่ ......... / ....................... / ...............</div>
          </div>
          <div className="text-center">
            <div>ลงชื่อ .................................................... ผู้ตรวจสอบ/หัวหน้างาน</div>
            <div className="mt-1">(....................................................)</div>
            <div className="text-secondary">วันที่ ......... / ....................... / ...............</div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
