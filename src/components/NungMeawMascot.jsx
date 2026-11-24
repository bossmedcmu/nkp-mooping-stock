import React, { useEffect, useMemo, useState } from 'react';
import nungMeawImg from '../assets/nung-meaw.png';
import { formatThaiDate } from '../utils/thaiTime.js';

export default function NungMeawMascot({
  analytics,
  sourceType,
  onSelectUnitFromMascot,
  onOpenPrint,
  onSyncNow,
  onToggleColorMode,
  onToggleThemePreference,
  onNavigateTab,
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const [bubbleIndex, setBubbleIndex] = useState(0);
  const [isExcited, setIsExcited] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [assistantReply, setAssistantReply] = useState('');

  const topUnit = analytics.byUnit[0];
  const topEntitlement = analytics.entitlementSummary[0];

  const playfulMessages = useMemo(() => {
    const msgs = [
      'เหมียว~ อย่ามัวแต่นั่งจ้องตานุ้งเหมียว กดคลิกสิ เดี๋ยวช่วยหา รพ.สต. ให้!',
      `ดุนะบอกเลย! ยอดรวมตอนนี้ ${analytics.summary.totalPatients.toLocaleString()} รายแล้วนะ เช็กครบยังเอ่ย?`,
      topUnit
        ? `เหมียวแอบส่องมาให้: "${topUnit.unitName}" นำโด่งเลย (${topUnit.totalPatients.toLocaleString()} ราย)!`
        : 'เหมียวพร้อมช่วยค้นหาข้อมูลทุก รพ.สต. แล้วนะ!',
      'จะพิมพ์รายงาน A4 แนวนอนเมื่อไหร่ก็สะกิดนุ้งเหมียวได้เลยนะเหมียว~',
      sourceType === 'sample'
        ? 'แง้ว! ตอนนี้ยังเป็นข้อมูลตัวอย่างอยู่นะ อย่าลืมกด "ดึงข้อมูลล่าสุด" ข้างบนล่ะ!'
        : `สิทธิ ${topEntitlement?.shortLabel || 'UC'} เยอะสุด (${topEntitlement?.pct || 0}%) นุ้งเหมียวจำแม่นมาก!`,
      'ทำงานเหนื่อยมั้ย? พักดื่มน้ำหน่อย แต่นุ้งเหมียวยังไม่ยอมหยุดขยับหรอกนะ!',
    ];
    return msgs;
  }, [analytics.summary.totalPatients, topUnit, topEntitlement, sourceType]);

  // ข้อความปุยเมฆเชิงหยอกล้อขึ้นมาทุก 30 วินาที
  useEffect(() => {
    const timer = setInterval(() => {
      setBubbleIndex((prev) => (prev + 1) % playfulMessages.length);
      setBubbleVisible(true);
    }, 30000);
    return () => clearInterval(timer);
  }, [playfulMessages.length]);

  // Live search results inside Nung Meaw popover
  const searchResults = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return { units: [], records: [] };

    const units = analytics.byUnit
      .filter((u) => u.unitName.toLowerCase().includes(q))
      .slice(0, 5);

    const records = analytics.filtered
      .filter(
        (r) =>
          r.unitName.toLowerCase().includes(q) ||
          r.serviceMode.toLowerCase().includes(q) ||
          r.operationDate.includes(q) ||
          r.datasetLabel.toLowerCase().includes(q)
      )
      .slice(0, 5);

    return { units, records };
  }, [searchText, analytics.byUnit, analytics.filtered]);

  function handleMascotClick() {
    setIsExcited(true);
    setTimeout(() => setIsExcited(false), 600);
    setPanelOpen((v) => !v);
    setBubbleVisible(false);
  }

  function handleQuickSummary() {
    const s = analytics.summary;
    setAssistantReply(
      `เหมียวสรุปให้ด่วนเลย: ช่วง ${s.dateRangeStart} – ${s.dateRangeEnd} มีผู้รับบริการทั้งหมด ${s.totalPatients.toLocaleString()} ราย (${s.totalSessions} ครั้ง) แบ่งเป็น Lab ${s.labPatients.toLocaleString()} ราย และเบิกยา ${s.drugPatients.toLocaleString()} ราย ครอบคลุม ${s.activeUnitsCount} แห่ง!`
    );
  }

  function handleQuickWatchlist() {
    const topRec = analytics.insights.recommendations[0];
    if (topRec) {
      setAssistantReply(`จุดที่นุ้งเหมียวอยากให้รีบดู: [${topRec.category}] ${topRec.finding}`);
    } else {
      setAssistantReply('ตอนนี้ข้อมูลเรียบร้อยดี ยังไม่มีจุดผิดปกติน่าเป็นห่วงเหมียว~');
    }
  }

  return (
    <div className="nung-meaw-dock no-print">
      {/* Assistant Interactive Popover */}
      {panelOpen && (
        <div className="meaw-panel p-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="fw-bold font-display d-flex align-items-center gap-2">
              <span className="badge badge-pastel px-2 py-1">นุ้งเหมียวผู้ช่วย</span>
              <span className="small text-muted-theme">ถาม-ค้นหาไว</span>
            </div>
            <button
              type="button"
              className="btn-close btn-sm"
              aria-label="ปิดหน้าต่างนุ้งเหมียว"
              onClick={() => setPanelOpen(false)}
            />
          </div>

          {/* Search box */}
          <div className="input-group input-group-sm mb-2">
            <span className="input-group-text rounded-start-pill bg-transparent">
              <i className="bi bi-search text-accent" />
            </span>
            <input
              type="text"
              className="form-control rounded-end-pill"
              placeholder="พิมพ์ชื่อ รพ.สต., Yearly Lab, ไปรษณีย์, วันที่..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          {/* Search results */}
          {searchText.trim() && (
            <div className="mb-3">
              {searchResults.units.length === 0 && searchResults.records.length === 0 ? (
                <div className="small text-muted-theme py-2 text-center">
                  แง้ว~ ไม่พบ "{searchText}" ในตัวกรองนี้เลย
                </div>
              ) : (
                <div className="d-flex flex-column gap-1">
                  {searchResults.units.map((u) => (
                    <button
                      key={u.unitName}
                      type="button"
                      className="btn btn-sm text-start p-2 rounded-3"
                      style={{ background: 'var(--bg-surface-soft)', border: '1px solid var(--border-soft)' }}
                      onClick={() => {
                        onSelectUnitFromMascot(u.unitName);
                        setPanelOpen(false);
                      }}
                    >
                      <div className="fw-semibold text-accent small">{u.unitName}</div>
                      <div className="text-muted-theme" style={{ fontSize: '0.75rem' }}>
                        รวม {u.totalPatients.toLocaleString()} ราย (Lab {u.labPatients} / ยา {u.drugPatients}) — คลิกเพื่อเจาะลึก
                      </div>
                    </button>
                  ))}
                  {searchResults.units.length === 0 &&
                    searchResults.records.map((r) => (
                      <div
                        key={r.id}
                        className="p-2 rounded-3 small"
                        style={{ background: 'var(--bg-surface-soft)' }}
                      >
                        <div className="fw-semibold">{r.unitName}</div>
                        <div className="text-muted-theme" style={{ fontSize: '0.75rem' }}>
                          {formatThaiDate(r.operationDate, true)} • {r.serviceMode} • {r.total} ราย
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Assistant Actions */}
          <div className="d-flex flex-wrap gap-1 mb-2">
            <button type="button" className="btn btn-sm btn-pastel-soft" onClick={handleQuickSummary}>
              <i className="bi bi-chat-heart me-1" />
              สรุปยอดด่วน
            </button>
            <button type="button" className="btn btn-sm btn-pastel-soft" onClick={handleQuickWatchlist}>
              <i className="bi bi-exclamation-circle me-1" />
              จุดต้องติดตาม
            </button>
            <button
              type="button"
              className="btn btn-sm btn-pastel-soft"
              onClick={() => {
                onOpenPrint();
                setPanelOpen(false);
              }}
            >
              <i className="bi bi-printer me-1" />
              พิมพ์ A4
            </button>
            <button
              type="button"
              className="btn btn-sm btn-pastel-soft"
              onClick={() => {
                onNavigateTab('insights');
                setPanelOpen(false);
              }}
            >
              <i className="bi bi-lightbulb me-1" />
              ดูแนวทางแก้ไข
            </button>
            <button type="button" className="btn btn-sm btn-pastel-soft" onClick={onSyncNow}>
              <i className="bi bi-arrow-repeat me-1" />
              ดึงข้อมูลใหม่
            </button>
            <button type="button" className="btn btn-sm btn-pastel-soft" onClick={onToggleThemePreference}>
              <i className="bi bi-palette2 me-1" />
              สลับโทนสี
            </button>
            <button type="button" className="btn btn-sm btn-pastel-soft" onClick={onToggleColorMode}>
              <i className="bi bi-circle-half me-1" />
              สว่าง/มืด
            </button>
          </div>

          {assistantReply && (
            <div
              className="p-2 rounded-3 small"
              style={{ background: 'var(--accent-soft)', color: 'var(--text-main)' }}
            >
              {assistantReply}
            </div>
          )}
        </div>
      )}

      {/* Playful cloud bubble every 30s */}
      {bubbleVisible && !panelOpen && (
        <div className="meaw-cloud-bubble">
          <div className="d-flex justify-content-between align-items-start gap-2">
            <span>{playfulMessages[bubbleIndex]}</span>
            <button
              type="button"
              className="btn-close"
              style={{ fontSize: '0.6rem' }}
              aria-label="ซ่อนข้อความ"
              onClick={() => setBubbleVisible(false)}
            />
          </div>
        </div>
      )}

      {/* Frameless 3D Nung Meaw */}
      <button
        type="button"
        className="nung-meaw-figure-btn"
        onClick={handleMascotClick}
        title="คลิกนุ้งเหมียวเพื่อค้นหาข้อมูลหรือสั่งการด่วน"
        aria-label="นุ้งเหมียวผู้ช่วยแดชบอร์ด"
      >
        <img
          src={nungMeawImg}
          alt="นุ้งเหมียว"
          className={`nung-meaw-img ${isExcited ? 'is-excited' : ''}`}
        />
      </button>
    </div>
  );
}
