import React, { useState } from 'react';
import { ENTITLEMENT_FIELDS } from '../utils/dataNormalizer.js';
import { getThaiMonthLabel } from '../utils/thaiTime.js';

const FISCAL_MONTH_OPTIONS = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function FilterBar({
  quarter,
  onChangeQuarter,
  month,
  onChangeMonth,
  dateStart,
  onChangeDateStart,
  dateEnd,
  onChangeDateEnd,
  serviceMode,
  onChangeServiceMode,
  serviceModes,
  entitlementKey,
  onChangeEntitlementKey,
  activeFilterCount,
  onResetFilters,
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="pastel-card p-2 p-md-3 mb-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <button
          type="button"
          className="btn btn-sm btn-pastel-soft d-flex align-items-center gap-2"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <i className="bi bi-funnel-fill" />
          <span>ตัวกรองข้อมูลเชิงลึก</span>
          {activeFilterCount > 0 && (
            <span className="badge rounded-pill bg-danger text-white">{activeFilterCount}</span>
          )}
          <i className={`bi ${expanded ? 'bi-chevron-up' : 'bi-chevron-down'} small`} />
        </button>

        <div className="d-flex align-items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary rounded-pill px-3"
              onClick={onResetFilters}
            >
              <i className="bi bi-arrow-counterclockwise me-1" />
              ล้างตัวกรอง
            </button>
          )}
          <span className="small text-muted-theme d-none d-sm-inline">
            {expanded
              ? 'กรองตามไตรมาส เดือน ช่วงวันที่ ลักษณะบริการ และสิทธิ'
              : activeFilterCount > 0
                ? `กำลังใช้ตัวกรองเพิ่มเติม ${activeFilterCount} เงื่อนไข`
                : 'คลิกเพื่อกรองช่วงวันที่ ไตรมาส หรือสิทธิเฉพาะ'}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="row g-2 mt-2 pt-2 border-top" style={{ borderColor: 'var(--border-soft)' }}>
          <div className="col-6 col-md-4 col-xl-2">
            <label htmlFor="filter-quarter" className="form-label small fw-semibold mb-1">
              ไตรมาสปีงบ
            </label>
            <select
              id="filter-quarter"
              className="form-select form-select-sm"
              value={quarter}
              onChange={(e) => onChangeQuarter(e.target.value)}
            >
              <option value="ALL">ทุกไตรมาส</option>
              <option value="1">ไตรมาส 1 (ต.ค.–ธ.ค.)</option>
              <option value="2">ไตรมาส 2 (ม.ค.–มี.ค.)</option>
              <option value="3">ไตรมาส 3 (เม.ย.–มิ.ย.)</option>
              <option value="4">ไตรมาส 4 (ก.ค.–ก.ย.)</option>
            </select>
          </div>

          <div className="col-6 col-md-4 col-xl-2">
            <label htmlFor="filter-month" className="form-label small fw-semibold mb-1">
              เดือน
            </label>
            <select
              id="filter-month"
              className="form-select form-select-sm"
              value={month}
              onChange={(e) => onChangeMonth(e.target.value)}
            >
              <option value="ALL">ทุกเดือน</option>
              {FISCAL_MONTH_OPTIONS.map((m) => (
                <option key={m} value={String(m)}>
                  {getThaiMonthLabel(m, false)}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-4 col-xl-2">
            <label htmlFor="filter-date-start" className="form-label small fw-semibold mb-1">
              ตั้งแต่วันที่
            </label>
            <input
              id="filter-date-start"
              type="date"
              className="form-control form-control-sm"
              value={dateStart}
              onChange={(e) => onChangeDateStart(e.target.value)}
            />
          </div>

          <div className="col-6 col-md-4 col-xl-2">
            <label htmlFor="filter-date-end" className="form-label small fw-semibold mb-1">
              ถึงวันที่
            </label>
            <input
              id="filter-date-end"
              type="date"
              className="form-control form-control-sm"
              value={dateEnd}
              onChange={(e) => onChangeDateEnd(e.target.value)}
            />
          </div>

          <div className="col-6 col-md-4 col-xl-2">
            <label htmlFor="filter-service-mode" className="form-label small fw-semibold mb-1">
              ลักษณะบริการ
            </label>
            <select
              id="filter-service-mode"
              className="form-select form-select-sm"
              value={serviceMode}
              onChange={(e) => onChangeServiceMode(e.target.value)}
            >
              <option value="ALL">ทุกลักษณะบริการ</option>
              {serviceModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-4 col-xl-2">
            <label htmlFor="filter-entitlement" className="form-label small fw-semibold mb-1">
              มีผู้รับบริการสิทธิ
            </label>
            <select
              id="filter-entitlement"
              className="form-select form-select-sm"
              value={entitlementKey}
              onChange={(e) => onChangeEntitlementKey(e.target.value)}
            >
              <option value="ALL">ทุกสิทธิการรักษา</option>
              {ENTITLEMENT_FIELDS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
