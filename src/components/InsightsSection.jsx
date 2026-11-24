import React from 'react';

export default function InsightsSection({ insights, summary, byUnit }) {
  const priorityLabel = {
    high: { text: 'เร่งด่วน / สำคัญมาก', cls: 'bg-danger-subtle text-danger-emphasis' },
    medium: { text: 'ควรวางแผนปรับปรุง', cls: 'bg-warning-subtle text-warning-emphasis' },
    low: { text: 'ติดตามต่อเนื่อง', cls: 'bg-info-subtle text-info-emphasis' },
  };

  return (
    <div className="mb-4">
      {/* Executive Summary Narrative */}
      <div className="pastel-card p-3 p-md-4 mb-3">
        <div className="d-flex align-items-center gap-2 mb-2">
          <span
            className="d-inline-flex align-items-center justify-content-center rounded-circle text-white"
            style={{ width: 38, height: 38, background: 'var(--accent-gradient)' }}
          >
            <i className="bi bi-journal-medical" />
          </span>
          <div>
            <h2 className="h5 fw-bold mb-0">บทสรุปผลการสนับสนุนและวิเคราะห์เชิงลึก</h2>
            <div className="small text-muted-theme">ประมวลผลอัตโนมัติจากข้อมูลจริงตามตัวกรองปัจจุบัน</div>
          </div>
        </div>
        <p className="mb-0 lh-lg">{insights.executiveParagraph}</p>

        {insights.qualityAlerts.length > 0 && (
          <div className="mt-3 p-3 rounded-4" style={{ background: 'var(--bg-surface-soft)', border: '1px dashed var(--accent-secondary)' }}>
            <div className="fw-semibold text-accent small mb-1">
              <i className="bi bi-clipboard2-pulse me-1" />
              ข้อสังเกตด้านคุณภาพข้อมูล
            </div>
            <ul className="mb-0 small ps-3">
              {insights.qualityAlerts.map((alert, i) => (
                <li key={i}>{alert}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Actionable Recommendations */}
      <div className="row g-3 mb-3">
        {insights.recommendations.map((rec) => {
          const p = priorityLabel[rec.priority] || priorityLabel.medium;
          return (
            <div className="col-12 col-lg-6" key={rec.id}>
              <div className="pastel-card pastel-card-hover p-3 p-md-4 h-100">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                  <div className="fw-bold d-flex align-items-center gap-2">
                    <i className={`bi ${rec.icon} text-accent fs-5`} />
                    <span>{rec.category}</span>
                  </div>
                  <span className={`badge rounded-pill ${p.cls}`}>{p.text}</span>
                </div>
                <div className="small mb-2">
                  <strong className="text-accent">ข้อค้นพบ: </strong>
                  {rec.finding}
                </div>
                <div
                  className="small p-2 rounded-3"
                  style={{ background: 'var(--bg-surface-soft)', borderLeft: '3px solid var(--accent-primary)' }}
                >
                  <strong>แนวทางแก้ไขและดำเนินงานครั้งต่อไป: </strong>
                  {rec.action}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Watchlist Units */}
      {byUnit.length > 0 && (
        <div className="pastel-card p-3 p-md-4">
          <h3 className="h6 fw-bold mb-3">
            <i className="bi bi-stars text-accent me-2" />
            หน่วยบริการที่ควรให้ความสำคัญในการวางแผนรอบถัดไป (Top 5 ปริมาณสูงสุด)
          </h3>
          <div className="row g-2">
            {byUnit.slice(0, 5).map((u, idx) => (
              <div className="col-12 col-md-6 col-xl" key={u.unitName}>
                <div
                  className="p-3 rounded-4 h-100"
                  style={{ background: 'var(--bg-surface-soft)', border: '1px solid var(--border-soft)' }}
                >
                  <div className="small text-accent fw-bold">อันดับ {idx + 1}</div>
                  <div className="fw-semibold text-truncate mb-1" title={u.unitName}>
                    {u.unitName}
                  </div>
                  <div className="small text-muted-theme">
                    รวม <strong>{u.totalPatients.toLocaleString()}</strong> ราย ({u.totalSessions} ครั้ง)
                  </div>
                  <div className="small text-muted-theme">
                    Lab {u.labPatients.toLocaleString()} / ยา {u.drugPatients.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="small text-muted-theme mt-2">
            เฉลี่ยทั้งเครือข่าย {summary.avgPatientsPerSession} ราย/ครั้ง
          </div>
        </div>
      )}
    </div>
  );
}
