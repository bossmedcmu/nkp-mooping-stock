import React from 'react';

export default function Navbar({
  username,
  fiscalYears,
  selectedFiscalYear,
  onChangeFiscalYear,
  datasetMode,
  onChangeDatasetMode,
  lastUpdatedLabel,
  sourceType,
  isSyncing,
  onSyncNow,
  onOpenPrint,
  colorMode,
  onToggleColorMode,
  themePreference,
  onToggleThemePreference,
  todayThemeInfo,
  onLogout,
}) {
  return (
    <header className="pastel-navbar sticky-top py-2 px-3 px-lg-4 mb-4">
      <div className="container-fluid px-0">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          {/* Brand */}
          <div className="d-flex align-items-center gap-2">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle text-white shadow-sm"
              style={{
                width: 42,
                height: 42,
                background: 'var(--accent-gradient)',
                flexShrink: 0,
              }}
            >
              <i className="bi bi-hospital fs-5" />
            </div>
            <div>
              <div className="fw-bold font-display lh-sm" style={{ fontSize: '1.05rem' }}>
                แดชบอร์ดสนับสนุนเครือข่าย รพ.สต.
              </div>
              <div className="d-flex flex-wrap align-items-center gap-2 small text-muted-theme">
                <span>
                  <i className="bi bi-clock-history me-1 text-accent" />
                  อัปเดตล่าสุด: <strong>{lastUpdatedLabel}</strong>
                </span>
                <span
                  className={`badge rounded-pill ${
                    sourceType === 'live' ? 'bg-success-subtle text-success-emphasis' : 'badge-pastel'
                  }`}
                >
                  {sourceType === 'live' ? 'ข้อมูลจริงล่าสุด' : 'ข้อมูลตัวอย่าง'}
                </span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Fiscal Year Filter */}
            <div className="d-flex align-items-center gap-1">
              <label htmlFor="fy-select" className="small text-muted-theme d-none d-xl-inline">
                ปีงบ:
              </label>
              <select
                id="fy-select"
                className="form-select form-select-sm rounded-pill"
                style={{ width: 'auto', minWidth: 138 }}
                value={selectedFiscalYear}
                onChange={(e) => onChangeFiscalYear(e.target.value)}
                aria-label="เลือกปีงบประมาณ"
              >
                <option value="ALL">ทุกปีงบประมาณ</option>
                {fiscalYears.map((fy) => (
                  <option key={fy} value={String(fy)}>
                    ปีงบประมาณ {fy}
                  </option>
                ))}
              </select>
            </div>

            {/* Dataset Mode Filter */}
            <div className="btn-group btn-group-sm" role="group" aria-label="เลือกประเภทข้อมูล">
              <button
                type="button"
                className={`btn rounded-start-pill ${
                  datasetMode === 'ALL' ? 'btn-pastel-primary' : 'btn-pastel-soft'
                }`}
                onClick={() => onChangeDatasetMode('ALL')}
              >
                รวม 2 งาน
              </button>
              <button
                type="button"
                className={`btn ${
                  datasetMode === 'lab' ? 'btn-pastel-primary' : 'btn-pastel-soft'
                }`}
                onClick={() => onChangeDatasetMode('lab')}
              >
                ส่งตรวจ Lab
              </button>
              <button
                type="button"
                className={`btn rounded-end-pill ${
                  datasetMode === 'drug' ? 'btn-pastel-primary' : 'btn-pastel-soft'
                }`}
                onClick={() => onChangeDatasetMode('drug')}
              >
                เบิกยา
              </button>
            </div>

            {/* Sync Button */}
            <button
              type="button"
              className="btn btn-sm btn-pastel-primary px-3"
              onClick={onSyncNow}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" />
                  กำลังดึงข้อมูล...
                </>
              ) : (
                <>
                  <i className="bi bi-cloud-arrow-down-fill me-1" />
                  ดึงข้อมูลล่าสุด
                </>
              )}
            </button>

            {/* Print A4 Button */}
            <button
              type="button"
              className="btn btn-sm btn-pastel-soft px-3"
              onClick={onOpenPrint}
            >
              <i className="bi bi-printer-fill me-1" />
              พิมพ์รายงาน A4
            </button>

            {/* Theme Preference */}
            <button
              type="button"
              className="btn btn-sm btn-pastel-soft"
              onClick={onToggleThemePreference}
              title={`สลับโหมดสี (${todayThemeInfo.name})`}
            >
              <i className="bi bi-palette2 me-1" />
              <span className="d-none d-md-inline">
                {themePreference === 'auto' ? `สี${todayThemeInfo.shortName}` : 'ชมพูอ่อน'}
              </span>
            </button>

            {/* Light/Dark */}
            <button
              type="button"
              className="btn btn-sm btn-pastel-soft"
              onClick={onToggleColorMode}
              title="สลับโหมดสว่าง / โหมดมืด"
              aria-label="สลับโหมดสว่างหรือมืด"
            >
              <i className={`bi ${colorMode === 'dark' ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`} />
            </button>

            {/* Logout */}
            <button
              type="button"
              className="btn btn-sm btn-outline-danger rounded-pill px-3"
              onClick={onLogout}
              title={`ออกจากระบบ (${username})`}
            >
              <i className="bi bi-box-arrow-right me-1" />
              <span className="d-none d-md-inline">ออก</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
