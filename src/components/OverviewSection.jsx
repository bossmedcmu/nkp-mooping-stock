import React from 'react';

export default function OverviewSection({ summary, entitlementSummary, labModes, drugModes }) {
  const kpiCards = [
    {
      title: 'ผู้รับบริการรวมทั้งหมด',
      value: summary.totalPatients.toLocaleString(),
      unit: 'ราย',
      sub: `จาก ${summary.totalSessions.toLocaleString()} ครั้งที่ดำเนินการ`,
      icon: 'bi-people-fill',
      accent: 'linear-gradient(135deg, #ec4899, #fb7185)',
    },
    {
      title: 'สนับสนุนส่งสิ่งส่งตรวจ (Lab)',
      value: summary.labPatients.toLocaleString(),
      unit: 'ราย',
      sub: `${summary.labSessions.toLocaleString()} ครั้ง | เฉลี่ย ${
        summary.labSessions > 0 ? (summary.labPatients / summary.labSessions).toFixed(1) : 0
      } ราย/ครั้ง`,
      icon: 'bi-eyedropper',
      accent: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
    },
    {
      title: 'เบิกยาที่ไม่มีใช้ใน รพ.สต.',
      value: summary.drugPatients.toLocaleString(),
      unit: 'ราย',
      sub: `${summary.drugSessions.toLocaleString()} ครั้ง | เฉลี่ย ${
        summary.drugSessions > 0 ? (summary.drugPatients / summary.drugSessions).toFixed(1) : 0
      } ราย/ครั้ง`,
      icon: 'bi-capsule-pill',
      accent: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
    },
    {
      title: 'หน่วยบริการเครือข่ายที่รับบริการ',
      value: summary.activeUnitsCount.toLocaleString(),
      unit: 'แห่ง',
      sub: `ช่วง ${summary.dateRangeStart} – ${summary.dateRangeEnd}`,
      icon: 'bi-building-check',
      accent: 'linear-gradient(135deg, #10b981, #34d399)',
    },
  ];

  return (
    <div className="mb-4">
      {/* KPI Grid */}
      <div className="row g-3 mb-3">
        {kpiCards.map((card) => (
          <div className="col-12 col-sm-6 col-xl-3" key={card.title}>
            <div className="pastel-card pastel-card-hover p-3 h-100 d-flex flex-column justify-content-between">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <span className="small fw-semibold text-muted-theme">{card.title}</span>
                <span
                  className="d-inline-flex align-items-center justify-content-center rounded-circle text-white"
                  style={{ width: 38, height: 38, background: card.accent, flexShrink: 0 }}
                >
                  <i className={`bi ${card.icon}`} />
                </span>
              </div>
              <div>
                <div className="d-flex align-items-baseline gap-2">
                  <span className="fs-2 fw-bold font-display">{card.value}</span>
                  <span className="small text-muted-theme">{card.unit}</span>
                </div>
                <div className="small text-muted-theme mt-1">{card.sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sub-strip: 8 Entitlements & Service Modes quick pills */}
      <div className="row g-3">
        <div className="col-12 col-lg-7">
          <div className="pastel-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h2 className="h6 fw-bold mb-0">
                <i className="bi bi-pie-chart-fill text-accent me-2" />
                สรุปตามสิทธิการรักษา 8 กลุ่ม
              </h2>
              <span className="small text-muted-theme">รวม Lab + ยา</span>
            </div>
            <div className="row g-2">
              {entitlementSummary.map((e) => (
                <div className="col-6 col-sm-4 col-md-3" key={e.key}>
                  <div
                    className="p-2 rounded-3 h-100"
                    style={{ background: 'var(--bg-surface-soft)', border: '1px solid var(--border-soft)' }}
                  >
                    <div className="d-flex align-items-center gap-1 small text-muted-theme text-truncate">
                      <span
                        className="rounded-circle d-inline-block"
                        style={{ width: 8, height: 8, backgroundColor: e.color, flexShrink: 0 }}
                      />
                      <span className="text-truncate" title={e.label}>
                        {e.shortLabel}
                      </span>
                    </div>
                    <div className="fw-bold mt-1">
                      {e.count.toLocaleString()}{' '}
                      <span className="small fw-normal text-muted-theme">({e.pct}%)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="pastel-card p-3 h-100">
            <h2 className="h6 fw-bold mb-2">
              <i className="bi bi-diagram-3-fill text-accent me-2" />
              สัดส่วนลักษณะการให้บริการ
            </h2>
            <div className="mb-2">
              <div className="small fw-semibold text-accent mb-1">การส่งสิ่งส่งตรวจ (Lab)</div>
              {labModes.length === 0 ? (
                <div className="small text-muted-theme">- ไม่มีข้อมูล -</div>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {labModes.map((m) => (
                    <span key={m.mode} className="badge badge-pastel px-3 py-2">
                      {m.mode}: <strong>{m.patients.toLocaleString()}</strong> ราย ({m.sessions} ครั้ง)
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="small fw-semibold text-accent mb-1">ลักษณะการรับยา รพ.สต.</div>
              {drugModes.length === 0 ? (
                <div className="small text-muted-theme">- ไม่มีข้อมูล -</div>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {drugModes.map((m) => (
                    <span key={m.mode} className="badge badge-pastel px-3 py-2">
                      {m.mode}: <strong>{m.patients.toLocaleString()}</strong> ราย ({m.sessions} ครั้ง)
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
