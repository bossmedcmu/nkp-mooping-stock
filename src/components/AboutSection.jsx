import React from 'react';
import {
  SECURITY_HIGHLIGHTS,
  SYSTEM_FEATURES,
  SYSTEM_UPDATED_ISO,
  SYSTEM_VERSION,
  USER_CHANGELOG,
} from '../data/systemMeta.js';
import { formatThaiDateTime } from '../utils/thaiTime.js';

export default function AboutSection({ lastUpdatedLabel, sourceType }) {
  const systemUpdatedLabel = SYSTEM_UPDATED_ISO
    ? formatThaiDateTime(SYSTEM_UPDATED_ISO)
    : 'อัปเดตพร้อมรอบการเผยแพร่ล่าสุด';

  return (
    <div className="mb-4">
      {/* Hero Summary Card */}
      <div className="pastel-card p-3 p-md-4 mb-3">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle text-white shadow-sm"
              style={{
                width: 54,
                height: 54,
                background: 'var(--accent-gradient)',
                flexShrink: 0,
              }}
            >
              <i className="bi bi-hospital-fill fs-4" />
            </div>
            <div>
              <span className="badge badge-pastel px-3 py-1 mb-1">
                เวอร์ชัน {SYSTEM_VERSION}
              </span>
              <h2 className="h4 fw-bold mb-1">
                ระบบแดชบอร์ดสนับสนุนเครือข่ายบริการปฐมภูมิ (รพ.สต.)
              </h2>
              <p className="small text-muted-theme mb-0">
                ระบบติดตาม วิเคราะห์ และจัดทำรายงานผลการดำเนินงานสนับสนุนการส่งสิ่งส่งตรวจทางห้องปฏิบัติการ (Lab)
                และทะเบียนเบิกยาเครือข่าย รพ.สต. อย่างครบวงจร
              </p>
            </div>
          </div>

          <div
            className="p-3 rounded-4 w-100 w-lg-auto"
            style={{
              background: 'var(--bg-surface-soft)',
              border: '1px solid var(--border-soft)',
              minWidth: 270,
            }}
          >
            <div className="small text-muted-theme">
              <i className="bi bi-calendar2-check-fill text-accent me-2" />
              วันและเวลาปรับปรุงระบบล่าสุด
            </div>
            <div className="fw-bold mt-1">{systemUpdatedLabel}</div>
            <div className="small text-muted-theme mt-2 pt-2 border-top" style={{ borderColor: 'var(--border-soft)' }}>
              <i className="bi bi-cloud-check-fill text-accent me-2" />
              ข้อมูลชุดปัจจุบัน:{' '}
              <strong>{sourceType === 'live' ? lastUpdatedLabel : 'ยังไม่ได้ดึงข้อมูล'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* System Features Grid */}
      <div className="pastel-card p-3 p-md-4 mb-3">
        <h3 className="h5 fw-bold mb-3">
          <i className="bi bi-stars text-accent me-2" />
          คำอธิบายคุณสมบัติระบบครบทุกโมดูล
        </h3>
        <div className="row g-3">
          {SYSTEM_FEATURES.map((feat) => (
            <div className="col-12 col-md-6" key={feat.title}>
              <div
                className="p-3 rounded-4 h-100"
                style={{ background: 'var(--bg-surface-soft)', border: '1px solid var(--border-soft)' }}
              >
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span
                    className="d-inline-flex align-items-center justify-content-center rounded-circle text-white"
                    style={{ width: 32, height: 32, background: 'var(--accent-gradient)', flexShrink: 0 }}
                  >
                    <i className={`bi ${feat.icon} small`} />
                  </span>
                  <h4 className="h6 fw-bold mb-0">{feat.title}</h4>
                </div>
                <p className="small text-muted-theme mb-0 lh-base mt-2">{feat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Governance & Changelog */}
      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="pastel-card p-3 p-md-4 h-100">
            <h3 className="h6 fw-bold mb-3">
              <i className="bi bi-shield-lock-fill text-accent me-2" />
              มาตรฐานการคุ้มครองและความปลอดภัยของข้อมูล
            </h3>
            <ul className="list-unstyled d-flex flex-column gap-2 mb-0 small">
              {SECURITY_HIGHLIGHTS.map((item, idx) => (
                <li
                  key={idx}
                  className="p-2 rounded-3 d-flex align-items-start gap-2"
                  style={{ background: 'var(--bg-surface-soft)' }}
                >
                  <i className="bi bi-check-circle-fill text-success mt-1" />
                  <span className="lh-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="pastel-card p-3 p-md-4 h-100">
            <h3 className="h6 fw-bold mb-3">
              <i className="bi bi-journal-text text-accent me-2" />
              ประวัติการปรับปรุงระบบสำหรับผู้ใช้งาน
            </h3>
            {USER_CHANGELOG.map((entry) => (
              <div key={entry.version}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge badge-pastel px-3 py-1">รุ่น {entry.version}</span>
                  <span className="small text-muted-theme">{entry.dateLabel}</span>
                </div>
                <ul className="small ps-3 mb-0 d-flex flex-column gap-1 lh-base">
                  {entry.items.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
