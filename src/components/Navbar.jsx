import React, { useState } from 'react';

export default function Navbar({
  username,
  fiscalYears,
  selectedFiscalYear,
  onChangeFiscalYear,
  datasetMode,
  onChangeDatasetMode,
  lastUpdatedLabel,
  sourceType,
  remainingMinutes,
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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const hasHeaderFilterActive = selectedFiscalYear !== 'ALL' || datasetMode !== 'ALL';

  return (
    <header className="pastel-navbar sticky-top py-2 px-3 px-lg-4 mb-3 mb-lg-4">
      <div className="container-fluid px-0">
        {/* Compact Mobile Header (< lg) */}
        <div className="d-flex d-lg-none align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2 min-w-0">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle text-white shadow-sm"
              style={{
                width: 34,
                height: 34,
                background: 'var(--accent-gradient)',
                flexShrink: 0,
              }}
            >
              <i className="bi bi-hospital" />
            </div>
            <div className="min-w-0">
              <div className="fw-bold font-display text-truncate" style={{ fontSize: '0.94rem' }}>
                แดชบอร์ด รพ.สต.
              </div>
              <div className="d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                {sourceType === 'live' ? (
                  <span className="text-success fw-semibold text-truncate">
                    ● ข้อมูลจริง {remainingMinutes > 0 ? `(ล้างใน ${remainingMinutes} น.)` : ''}
                  </span>
                ) : (
                  <span className="text-muted-theme text-truncate">รอข้อมูลล่าสุด</span>
                )}
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-1 flex-shrink-0">
            <button
              type="button"
              className="btn btn-sm btn-pastel-primary px-2 py-1"
              onClick={onSyncNow}
              disabled={isSyncing}
              title="ดึงข้อมูลล่าสุด"
              aria-label="ดึงข้อมูลล่าสุด"
            >
              {isSyncing ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <i className="bi bi-cloud-arrow-down-fill" />
              )}
            </button>

            <button
              type="button"
              className="btn btn-sm btn-pastel-soft px-2 py-1 position-relative"
              onClick={() => setMobileDrawerOpen((v) => !v)}
              aria-expanded={mobileDrawerOpen}
              aria-label="เปิดหรือปิดแถบเครื่องมือ"
              title="ตัวกรองและเครื่องมือ"
            >
              <i className={`bi ${mobileDrawerOpen ? 'bi-x-lg' : 'bi-sliders'}`} />
              {hasHeaderFilterActive && !mobileDrawerOpen && (
                <span
                  className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"
                  aria-hidden="true"
                />
              )}
            </button>

            <button
              type="button"
              className="btn btn-sm btn-outline-danger rounded-pill px-2 py-1"
              onClick={onLogout}
              title={`ออกจากระบบ (${username})`}
              aria-label="ออกจากระบบ"
            >
              <i className="bi bi-box-arrow-right" />
            </button>
          </div>
        </div>

        {/* Mobile Collapsible Controls Drawer */}
        {mobileDrawerOpen && (
          <div
            className="d-lg-none mt-2 pt-2 border-top d-flex flex-column gap-2"
            style={{ borderColor: 'var(--border-soft)' }}
          >
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-1 small text-muted-theme">
              <span>
                <i className="bi bi-clock-history me-1 text-accent" />
                อัปเดต: <strong>{lastUpdatedLabel}</strong>
              </span>
              {sourceType === 'live' && remainingMinutes > 0 && (
                <span className="badge badge-pastel">ล้างข้อมูลอัตโนมัติใน {remainingMinutes} นาที</span>
              )}
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2">
              <select
                className="form-select form-select-sm rounded-pill flex-grow-1"
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

              <div className="btn-group btn-group-sm" role="group" aria-label="เลือกประเภทข้อมูล">
                <button
                  type="button"
                  className={`btn rounded-start-pill ${
                    datasetMode === 'ALL' ? 'btn-pastel-primary' : 'btn-pastel-soft'
                  }`}
                  onClick={() => onChangeDatasetMode('ALL')}
                >
                  รวม
                </button>
                <button
                  type="button"
                  className={`btn ${
                    datasetMode === 'lab' ? 'btn-pastel-primary' : 'btn-pastel-soft'
                  }`}
                  onClick={() => onChangeDatasetMode('lab')}
                >
                  Lab
                </button>
                <button
                  type="button"
                  className={`btn rounded-end-pill ${
                    datasetMode === 'drug' ? 'btn-pastel-primary' : 'btn-pastel-soft'
                  }`}
                  onClick={() => onChangeDatasetMode('drug')}
                >
                  ยา
                </button>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-sm btn-pastel-soft flex-grow-1"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  onOpenPrint();
                }}
              >
                <i className="bi bi-printer-fill me-1" />
                พิมพ์รายงาน A4
              </button>
              <button
                type="button"
                className="btn btn-sm btn-pastel-soft"
                onClick={onToggleThemePreference}
              >
                <i className="bi bi-palette2 me-1" />
                {themePreference === 'auto' ? `สี${todayThemeInfo.shortName}` : 'ชมพูอ่อน'}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-pastel-soft"
                onClick={onToggleColorMode}
                aria-label="สลับโหมดสว่างหรือมืด"
              >
                <i className={`bi ${colorMode === 'dark' ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`} />
              </button>
            </div>
          </div>
        )}

        {/* Desktop Header (>= lg) */}
        <div className="d-none d-lg-flex flex-wrap align-items-center justify-content-between gap-2">
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
                {sourceType === 'live' ? (
                  <>
                    <span className="badge rounded-pill bg-success-subtle text-success-emphasis">
                      ข้อมูลจริงล่าสุด
                    </span>
                    {remainingMinutes > 0 && (
                      <span
                        className="badge rounded-pill badge-pastel"
                        title="ข้อมูลชั่วคราวจะถูกล้างออกอัตโนมัติเมื่อครบ 60 นาที หรือเมื่อออกจากระบบ"
                      >
                        <i className="bi bi-hourglass-split me-1" />
                        ล้างอัตโนมัติใน {remainingMinutes} นาที
                      </span>
                    )}
                  </>
                ) : (
                  <span className="badge rounded-pill badge-pastel">รอเชื่อมต่อข้อมูล</span>
                )}
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
              <span className="d-none d-xl-inline">
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
              <span>ออก</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
