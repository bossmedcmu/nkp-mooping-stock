import React, { useEffect, useMemo, useRef, useState } from 'react';
import NungMeawFigure from './NungMeawFigure.jsx';
import { formatThaiDate } from '../utils/thaiTime.js';
import {
  answerMascotQuestion,
  clampMascotPosition,
  computeMascotLayout,
  EYE_ACCESSORY_ITEMS,
  HEAD_ACCESSORY_ITEMS,
  OUTFIT_ITEMS,
  playMeowSound,
  POSE_LABELS,
} from '../utils/nungMeawBrain.js';

const AUTO_POSES = ['sit', 'play', 'roll', 'sit', 'peek'];

export default function NungMeawMascot({
  analytics,
  sourceType,
  isSyncing = false,
  remainingMinutes = 0,
  datasetMode = 'ALL',
  activeFilterCount = 0,
  prefs,
  onUpdatePrefs,
  onSelectUnitFromMascot,
  onOpenPrint,
  onSyncNow,
  onToggleColorMode,
  onToggleThemePreference,
  onNavigateTab,
  onChangeDatasetMode,
  onResetFilters,
  onExportCsv,
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [activePanelTab, setActivePanelTab] = useState('assistant'); // 'assistant' | 'wardrobe' | 'play'
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const [bubbleOverride, setBubbleOverride] = useState('');
  const [bubbleIndex, setBubbleIndex] = useState(0);

  const [pose, setPose] = useState('sit');
  const [manualPoseLockedUntil, setManualPoseLockedUntil] = useState(0);
  const [isExcited, setIsExcited] = useState(false);
  const [showHearts, setShowHearts] = useState(false);
  const [showTreat, setShowTreat] = useState(false);
  const [showBall, setShowBall] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [assistantReply, setAssistantReply] = useState(null);

  const [isDragging, setIsDragging] = useState(false);
  const [microOffset, setMicroOffset] = useState({ x: 0, y: 0 });
  const [viewport, setViewport] = useState(() =>
    typeof window !== 'undefined'
      ? { w: window.innerWidth, h: window.innerHeight }
      : { w: 1200, h: 800 }
  );

  const dragStateRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const lastInteractionRef = useRef(Date.now());
  const lastClickTimeRef = useRef(0);
  const warnedExpiryRef = useRef(false);
  const prevSyncingRef = useRef(isSyncing);

  const topUnit = analytics.byUnit[0];
  const topEntitlement = analytics.entitlementSummary[0];

  const playfulMessages = useMemo(() => {
    const msgs = [
      'เหมียว~ ลากนุ้งเหมียวไปวางมุมไหนก็ได้นะ หรือกดแต่งตัวให้น้องหน่อยสิ!',
      `ดุนะบอกเลย! ยอดรวมตอนนี้ ${analytics.summary.totalPatients.toLocaleString()} รายแล้วนะ เช็กครบยังเอ่ย?`,
      topUnit
        ? `เหมียวแอบส่องมาให้: "${topUnit.unitName}" นำโด่งเลย (${topUnit.totalPatients.toLocaleString()} ราย)!`
        : 'เหมียวพร้อมช่วยค้นหาข้อมูลทุก รพ.สต. แล้วนะ!',
      'พิมพ์ถามนุ้งเหมียวได้เลยนะ เช่น "รพ.สต.ไหนเยอะสุด" หรือ "สิทธิ UC เท่าไหร่"',
      sourceType === 'live'
        ? `สิทธิ ${topEntitlement?.shortLabel || 'UC'} เยอะสุด (${topEntitlement?.pct || 0}%) นุ้งเหมียวจำแม่นมาก!`
        : 'แง้ว! กด "ดึงข้อมูลใหม่" เพื่ออัปเดตข้อมูลล่าสุดได้เลย!',
      'ทำงานเหนื่อยมั้ย? แวะโยนบอลหรือให้ปลาทูนุ้งเหมียวได้นะเหมียว~',
    ];
    return msgs;
  }, [analytics.summary.totalPatients, topUnit, topEntitlement, sourceType]);

  // อัปเดตขนาดหน้าจอและปรับตำแหน่งไม่ให้ล้นขอบเมื่อย่อ/ขยายหน้าต่าง
  useEffect(() => {
    function handleResize() {
      const nextVp = { w: window.innerWidth, h: window.innerHeight };
      setViewport(nextVp);
      if (prefs.position) {
        const clamped = clampMascotPosition(prefs.position, nextVp, nextVp.w <= 576);
        if (clamped.x !== prefs.position.x || clamped.y !== prefs.position.y) {
          onUpdatePrefs({ position: clamped });
        }
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [prefs.position, onUpdatePrefs]);

  // ข้อความปุยเมฆเชิงหยอกล้อขึ้นมาทุก 32 วินาที
  useEffect(() => {
    if (prefs.minimized) return undefined;
    const timer = setInterval(() => {
      setBubbleOverride('');
      setBubbleIndex((prev) => (prev + 1) % playfulMessages.length);
      setBubbleVisible(true);
    }, 32000);
    return () => clearInterval(timer);
  }, [playfulMessages.length, prefs.minimized]);

  // สลับอิริยาบถ + ขยับระยะสั้นๆ อัตโนมัติ และฟุบนอนเมื่อไม่มีการโต้ตอบนาน
  useEffect(() => {
    if (prefs.minimized) return undefined;
    const timer = setInterval(() => {
      if (dragStateRef.current.active || isSyncing) return;
      const now = Date.now();
      const idleMs = now - lastInteractionRef.current;

      if (idleMs > 75000 && !panelOpen) {
        setPose('sleep');
        setMicroOffset({ x: 0, y: 0 });
        return;
      }

      if (now < manualPoseLockedUntil) return;

      if (!panelOpen) {
        const nextPose = AUTO_POSES[Math.floor(Math.random() * AUTO_POSES.length)];
        setPose(nextPose);
        // ขยับตัวระยะสั้นๆ รอบจุดที่วางไว้ (คุมไม่ให้เกินขอบปลอดภัย)
        const nextDx = Math.round((Math.random() - 0.5) * 18);
        const nextDy = Math.round((Math.random() - 0.5) * 8);
        const vp = typeof window !== 'undefined' ? { w: window.innerWidth, h: window.innerHeight } : viewport;
        const basePos = clampMascotPosition(prefs.position, vp, vp.w <= 576);
        const shiftedPos = clampMascotPosition(
          { x: basePos.x + nextDx, y: basePos.y + nextDy },
          vp,
          vp.w <= 576
        );
        setMicroOffset({
          x: shiftedPos.x - basePos.x,
          y: shiftedPos.y - basePos.y,
        });
      }
    }, 6500);
    return () => clearInterval(timer);
  }, [prefs.minimized, panelOpen, isSyncing, manualPoseLockedUntil]);

  // อารมณ์ตามสถานะการดึงข้อมูลล่าสุด
  useEffect(() => {
    if (isSyncing) {
      setPose('peek');
      setBubbleOverride('กำลังดึงข้อมูลล่าสุดให้อยู่นะ รอแป๊บเดียวเหมียว~');
      setBubbleVisible(true);
    } else if (prevSyncingRef.current && !isSyncing) {
      setPose('happy');
      setShowHearts(true);
      setBubbleOverride('ดึงข้อมูลล่าสุดเรียบร้อยแล้วเหมียว!');
      setBubbleVisible(true);
      setTimeout(() => setShowHearts(false), 1800);
    }
    prevSyncingRef.current = isSyncing;
  }, [isSyncing]);

  // แจ้งเตือนเมื่อเวลาข้อมูลชั่วคราว 60 นาทีเหลือน้อย (<= 10 นาที)
  useEffect(() => {
    if (remainingMinutes > 0 && remainingMinutes <= 10 && !warnedExpiryRef.current) {
      warnedExpiryRef.current = true;
      setBubbleOverride(
        `สะกิดเตือน: ข้อมูลชั่วคราวเหลืออีก ${remainingMinutes} นาที กดดึงข้อมูลใหม่ได้ตลอดนะเหมียว`
      );
      setBubbleVisible(true);
      playMeowSound('alert', prefs.soundEnabled);
    } else if (remainingMinutes > 10) {
      warnedExpiryRef.current = false;
    }
  }, [remainingMinutes, prefs.soundEnabled]);

  // ตัวเตือนพักสายตา / ดื่มน้ำ
  useEffect(() => {
    if (!prefs.breakReminderMinutes || prefs.breakReminderMinutes <= 0) return undefined;
    const ms = prefs.breakReminderMinutes * 60 * 1000;
    const timer = setInterval(() => {
      setPose('happy');
      setBubbleOverride(
        `ครบ ${prefs.breakReminderMinutes} นาทีแล้ว พักสายตาและดื่มน้ำสักแก้วนะคนเก่ง เหมียวเป็นห่วง~`
      );
      setBubbleVisible(true);
      playMeowSound('alert', prefs.soundEnabled);
    }, ms);
    return () => clearInterval(timer);
  }, [prefs.breakReminderMinutes, prefs.soundEnabled]);

  // ค้นหารายชื่อ รพ.สต. หรือรายการจากช่องค้นหา
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
      .slice(0, 4);

    return { units, records };
  }, [searchText, analytics.byUnit, analytics.filtered]);

  function markInteraction() {
    lastInteractionRef.current = Date.now();
  }

  function triggerExcited(soundKind = 'meow') {
    setIsExcited(true);
    playMeowSound(soundKind, prefs.soundEnabled);
    setTimeout(() => setIsExcited(false), 620);
  }

  function handleSelectPose(newPose, durationMs = 15000) {
    markInteraction();
    setPose(newPose);
    setManualPoseLockedUntil(Date.now() + durationMs);
    if (newPose === 'play') {
      setShowBall(true);
      setTimeout(() => setShowBall(false), 3200);
    }
    triggerExcited(newPose === 'happy' ? 'happy' : 'meow');
  }

  function handlePetCat() {
    markInteraction();
    setPose('happy');
    setManualPoseLockedUntil(Date.now() + 8000);
    setShowHearts(true);
    setBubbleOverride('งื้อ~ ชอบจังเลย ลูบหัวอีกนะเหมียว!');
    setBubbleVisible(true);
    triggerExcited('purr');
    onUpdatePrefs({
      happiness: Math.min(100, (prefs.happiness ?? 80) + 6),
    });
    setTimeout(() => setShowHearts(false), 1800);
  }

  function handleThrowBall() {
    markInteraction();
    setPose('play');
    setManualPoseLockedUntil(Date.now() + 12000);
    setShowBall(true);
    setShowHearts(true);
    setBubbleOverride('เย้! โยนบอลมาอีกสิ เหมียวตะปบทันหมดเลย!');
    setBubbleVisible(true);
    playMeowSound('boing', prefs.soundEnabled);
    onUpdatePrefs({
      happiness: Math.min(100, (prefs.happiness ?? 80) + 8),
    });
    setTimeout(() => setShowBall(false), 3500);
    setTimeout(() => setShowHearts(false), 1600);
  }

  function handleGiveTreat() {
    markInteraction();
    setPose('happy');
    setManualPoseLockedUntil(Date.now() + 10000);
    setShowTreat(true);
    setShowHearts(true);
    setBubbleOverride('ง่ำๆ ปลาทูอร่อยมาก! มีแรงช่วยตรวจยอด รพ.สต. ต่อแล้วเหมียว!');
    setBubbleVisible(true);
    playMeowSound('happy', prefs.soundEnabled);
    onUpdatePrefs({
      happiness: Math.min(100, (prefs.happiness ?? 80) + 10),
      treatsGiven: (prefs.treatsGiven || 0) + 1,
    });
    setTimeout(() => setShowTreat(false), 1800);
    setTimeout(() => setShowHearts(false), 1800);
  }

  function handleAskQuestion(customQuery) {
    markInteraction();
    const q = typeof customQuery === 'string' ? customQuery : searchText;
    const reply = answerMascotQuestion(q, analytics, { remainingMinutes, sourceType });
    setAssistantReply(reply);
    setPose('happy');
    setManualPoseLockedUntil(Date.now() + 8000);
    triggerExcited('meow');
  }

  function handleExecuteReplyAction(action) {
    if (!action) return;
    if (action.type === 'unit') {
      onSelectUnitFromMascot(action.payload);
      setPanelOpen(false);
    } else if (action.type === 'tab') {
      onNavigateTab(action.payload);
      setPanelOpen(false);
    } else if (action.type === 'print') {
      onOpenPrint();
      setPanelOpen(false);
    } else if (action.type === 'resetFilters' && onResetFilters) {
      onResetFilters();
    }
  }

  // จัดการลากเปลี่ยนตำแหน่ง + คลิก / ดับเบิลคลิก
  function handlePointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    markInteraction();
    const figureEl = e.currentTarget;
    const rect = figureEl.getBoundingClientRect();
    const currentPos = prefs.position || { x: rect.left, y: rect.top };

    dragStateRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      originX: currentPos.x,
      originY: currentPos.y,
    };

    try {
      figureEl.setPointerCapture(e.pointerId);
    } catch {
      // ignore if unsupported
    }
  }

  function handlePointerMove(e) {
    const st = dragStateRef.current;
    if (!st.active) return;

    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (!st.moved && Math.hypot(dx, dy) > 6) {
      st.moved = true;
      setIsDragging(true);
      setPose('happy');
      setMicroOffset({ x: 0, y: 0 });
    }

    if (st.moved) {
      const vp = { w: window.innerWidth, h: window.innerHeight };
      const nextPos = clampMascotPosition(
        {
          x: st.originX + dx,
          y: st.originY + dy,
        },
        vp,
        vp.w <= 576
      );
      onUpdatePrefs({ position: nextPos });
    }
  }

  function handlePointerUp(e) {
    const st = dragStateRef.current;
    if (!st.active) return;
    st.active = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (st.moved) {
      setIsDragging(false);
      setManualPoseLockedUntil(Date.now() + 5000);
      playMeowSound('meow', prefs.soundEnabled);
      return;
    }

    // แยกแยะคลิกเดียว (เปิด/ปิดแผง) กับดับเบิลคลิก (ลูบหัว)
    const now = Date.now();
    if (now - lastClickTimeRef.current < 280) {
      lastClickTimeRef.current = 0;
      handlePetCat();
      return;
    }
    lastClickTimeRef.current = now;

    setPanelOpen((v) => !v);
    setBubbleVisible(false);
    triggerExcited('meow');
  }

  function handlePointerCancel() {
    dragStateRef.current.active = false;
    setIsDragging(false);
  }

  // คำนวณพิกัดแยกส่วนสำหรับตัวนุ้งเหมียว กรอบแผง และปุยเมฆข้อความไม่ให้ตกขอบจอ
  const layout = computeMascotLayout(prefs.position, viewport);

  // โหมดพับเก็บชั่วคราว
  if (prefs.minimized) {
    return (
      <div className="nung-meaw-minimized-dock no-print">
        <button
          type="button"
          className="btn btn-sm btn-pastel-primary shadow d-flex align-items-center gap-2 px-3 py-2"
          onClick={() => {
            markInteraction();
            onUpdatePrefs({ minimized: false });
            triggerExcited('meow');
          }}
          title="เรียกนุ้งเหมียวกลับมา"
        >
          <span>🐱</span>
          <span className="small fw-semibold">เรียกนุ้งเหมียว</span>
        </button>
      </div>
    );
  }

  const anchorFigureSize = layout.isMobile ? 0.8 : 1;
  const bubbleText = bubbleOverride || playfulMessages[bubbleIndex];

  return (
    <>
      {/* แผงควบคุมแบบป๊อปโอเวอร์ (ยึดขอบจออัตโนมัติ ไม่ดันตัวนุ้งเหมียวตกขอบ) */}
      {panelOpen && (
        <div className="meaw-panel no-print p-3" style={layout.panelStyle}>
          {/* หัวแผง + สถานะความสุข + ปุ่มควบคุม */}
          <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="badge badge-pastel px-2 py-1">นุ้งเหมียวผู้ช่วย</span>
              <span className="small text-muted-theme">
                สุข {prefs.happiness ?? 86}%
              </span>
            </div>
            <div className="d-flex align-items-center gap-1">
              <button
                type="button"
                className="btn btn-sm btn-pastel-soft py-0 px-2"
                title={prefs.soundEnabled ? 'ปิดเสียงเหมียว' : 'เปิดเสียงเหมียว'}
                onClick={() => onUpdatePrefs({ soundEnabled: !prefs.soundEnabled })}
              >
                <i className={`bi ${prefs.soundEnabled ? 'bi-volume-up-fill' : 'bi-volume-mute-fill'}`} />
              </button>
              <button
                type="button"
                className="btn btn-sm btn-pastel-soft py-0 px-2"
                title="พับเก็บชั่วคราว"
                onClick={() => {
                  setPanelOpen(false);
                  onUpdatePrefs({ minimized: true });
                }}
              >
                <i className="bi bi-dash-lg" />
              </button>
              <button
                type="button"
                className="btn-close btn-sm ms-1"
                aria-label="ปิดหน้าต่างนุ้งเหมียว"
                onClick={() => setPanelOpen(false)}
              />
            </div>
          </div>

          {/* แถบเลือกหมวดในแผง */}
          <div className="btn-group btn-group-sm w-100 mb-2" role="group" aria-label="หมวดความสามารถนุ้งเหมียว">
            <button
              type="button"
              className={`btn ${activePanelTab === 'assistant' ? 'btn-pastel-primary' : 'btn-pastel-soft'}`}
              onClick={() => setActivePanelTab('assistant')}
            >
              <i className="bi bi-chat-dots me-1" />
              ผู้ช่วย
            </button>
            <button
              type="button"
              className={`btn ${activePanelTab === 'wardrobe' ? 'btn-pastel-primary' : 'btn-pastel-soft'}`}
              onClick={() => setActivePanelTab('wardrobe')}
            >
              <i className="bi bi-bag-heart me-1" />
              แต่งตัว
            </button>
            <button
              type="button"
              className={`btn ${activePanelTab === 'play' ? 'btn-pastel-primary' : 'btn-pastel-soft'}`}
              onClick={() => setActivePanelTab('play')}
            >
              <i className="bi bi-controller me-1" />
              เล่น &amp; ตั้งค่า
            </button>
          </div>

          {/* หมวดที่ 1: ผู้ช่วยค้นหาและถาม-ตอบ */}
          {activePanelTab === 'assistant' && (
            <div>
              <form
                className="input-group input-group-sm mb-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskQuestion();
                }}
              >
                <span className="input-group-text rounded-start-pill bg-transparent">
                  <i className="bi bi-search text-accent" />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ถาม หรือพิมพ์ชื่อ รพ.สต. ..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                <button type="submit" className="btn btn-pastel-primary rounded-end-pill px-3">
                  ถาม
                </button>
              </form>

              {/* คำถามแนะนำถามไว */}
              <div className="d-flex flex-wrap gap-1 mb-2">
                {[
                  { label: 'รพ.สต.ไหนเยอะสุด', q: 'รพ.สต.ไหนเยอะสุด' },
                  { label: 'เทียบ Lab/ยา', q: 'เทียบ Lab กับ ยา' },
                  { label: 'สิทธิ UC', q: 'สิทธิ UC เท่าไหร่' },
                  { label: 'เดือนไหนพีคสุด', q: 'เดือนไหนพีคสุด' },
                  { label: 'จุดต้องติดตาม', q: 'จุดผิดปกติและล่าช้า' },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    className="btn btn-sm py-0 px-2 rounded-pill"
                    style={{
                      fontSize: '0.73rem',
                      background: 'var(--bg-surface-soft)',
                      border: '1px solid var(--border-soft)',
                      color: 'var(--accent-text)',
                    }}
                    onClick={() => {
                      setSearchText(chip.q);
                      handleAskQuestion(chip.q);
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* ผลคำตอบจากนุ้งเหมียว */}
              {assistantReply && (
                <div
                  className="p-2 rounded-3 small mb-2"
                  style={{ background: 'var(--accent-soft)', color: 'var(--text-main)' }}
                >
                  <div>{assistantReply.text}</div>
                  {assistantReply.action && (
                    <button
                      type="button"
                      className="btn btn-sm btn-pastel-primary mt-2 py-0 px-2"
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => handleExecuteReplyAction(assistantReply.action)}
                    >
                      {assistantReply.action.label} <i className="bi bi-arrow-right-short" />
                    </button>
                  )}
                </div>
              )}

              {/* ผลค้นหา รพ.สต. แบบสด */}
              {searchText.trim() && (searchResults.units.length > 0 || searchResults.records.length > 0) && (
                <div className="mb-2">
                  <div className="small text-muted-theme mb-1" style={{ fontSize: '0.72rem' }}>
                    หน่วยบริการ / รายการที่พบ:
                  </div>
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
                        <div className="text-muted-theme" style={{ fontSize: '0.73rem' }}>
                          รวม {u.totalPatients.toLocaleString()} ราย (Lab {u.labPatients} / ยา {u.drugPatients}) — คลิกเจาะลึก
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
                          <div className="text-muted-theme" style={{ fontSize: '0.73rem' }}>
                            {formatThaiDate(r.operationDate, true)} • {r.serviceMode} • {r.total} ราย
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* ทางลัดสั่งงานตัวกรองและแดชบอร์ด */}
              <div className="small fw-semibold text-muted-theme mb-1" style={{ fontSize: '0.74rem' }}>
                ทางลัดสั่งงานด่วน
              </div>
              <div className="d-flex flex-wrap gap-1">
                {onChangeDatasetMode && (
                  <>
                    <button
                      type="button"
                      className={`btn btn-sm ${datasetMode === 'ALL' ? 'btn-pastel-primary' : 'btn-pastel-soft'}`}
                      onClick={() => onChangeDatasetMode('ALL')}
                    >
                      รวมทั้งหมด
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${datasetMode === 'lab' ? 'btn-pastel-primary' : 'btn-pastel-soft'}`}
                      onClick={() => onChangeDatasetMode('lab')}
                    >
                      เฉพาะ Lab
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${datasetMode === 'drug' ? 'btn-pastel-primary' : 'btn-pastel-soft'}`}
                      onClick={() => onChangeDatasetMode('drug')}
                    >
                      เฉพาะเบิกยา
                    </button>
                  </>
                )}
                {onResetFilters && activeFilterCount > 0 && (
                  <button type="button" className="btn btn-sm btn-pastel-soft" onClick={onResetFilters}>
                    <i className="bi bi-eraser me-1" />
                    ล้างตัวกรอง ({activeFilterCount})
                  </button>
                )}
                {onExportCsv && (
                  <button
                    type="button"
                    className="btn btn-sm btn-pastel-soft"
                    onClick={() => {
                      onExportCsv();
                      setPose('happy');
                      setShowHearts(true);
                      setTimeout(() => setShowHearts(false), 1600);
                    }}
                  >
                    <i className="bi bi-file-earmark-spreadsheet me-1" />
                    ส่งออก CSV
                  </button>
                )}
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
                    onNavigateTab('deep');
                    setPanelOpen(false);
                  }}
                >
                  <i className="bi bi-compass me-1" />
                  วิเคราะห์เชิงลึก
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
                  แนวทางแก้ไข
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
            </div>
          )}

          {/* หมวดที่ 2: ตู้เสื้อผ้าและเครื่องประดับ */}
          {activePanelTab === 'wardrobe' && (
            <div className="d-flex flex-column gap-2">
              <div className="form-check form-switch small mb-1">
                <input
                  id="meaw-theme-sync"
                  type="checkbox"
                  className="form-check-input"
                  checked={Boolean(prefs.syncOutfitWithTheme)}
                  onChange={(e) => onUpdatePrefs({ syncOutfitWithTheme: e.target.checked })}
                />
                <label htmlFor="meaw-theme-sync" className="form-check-label">
                  เปลี่ยนสีชุดตามสีประจำวันอัตโนมัติ
                </label>
              </div>

              <div>
                <div className="small fw-semibold text-muted-theme mb-1" style={{ fontSize: '0.75rem' }}>
                  เสื้อ / ผ้าคลุม
                </div>
                <div className="d-flex flex-wrap gap-1">
                  {OUTFIT_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`btn btn-sm ${prefs.outfitId === item.id ? 'btn-pastel-primary' : 'btn-pastel-soft'}`}
                      onClick={() => {
                        markInteraction();
                        onUpdatePrefs({ outfitId: item.id });
                        triggerExcited('happy');
                      }}
                    >
                      <i className={`bi ${item.icon} me-1`} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="small fw-semibold text-muted-theme mb-1" style={{ fontSize: '0.75rem' }}>
                  หมวก / โบว์ประดับหัว
                </div>
                <div className="d-flex flex-wrap gap-1">
                  {HEAD_ACCESSORY_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`btn btn-sm ${prefs.headId === item.id ? 'btn-pastel-primary' : 'btn-pastel-soft'}`}
                      onClick={() => {
                        markInteraction();
                        onUpdatePrefs({ headId: item.id });
                        triggerExcited('meow');
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="small fw-semibold text-muted-theme mb-1" style={{ fontSize: '0.75rem' }}>
                  แว่นตา / แก้มใส
                </div>
                <div className="d-flex flex-wrap gap-1">
                  {EYE_ACCESSORY_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`btn btn-sm ${prefs.eyeId === item.id ? 'btn-pastel-primary' : 'btn-pastel-soft'}`}
                      onClick={() => {
                        markInteraction();
                        onUpdatePrefs({ eyeId: item.id });
                        triggerExcited('meow');
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="d-flex justify-content-end pt-1">
                <button
                  type="button"
                  className="btn btn-sm btn-link text-muted-theme text-decoration-none p-0 small"
                  onClick={() => onUpdatePrefs({ outfitId: 'none', headId: 'none', eyeId: 'none' })}
                >
                  ถอดชุดทั้งหมด
                </button>
              </div>
            </div>
          )}

          {/* หมวดที่ 3: เล่น มินิเกม อิริยาบถ และตั้งค่า */}
          {activePanelTab === 'play' && (
            <div className="d-flex flex-column gap-2">
              <div className="p-2 rounded-3" style={{ background: 'var(--bg-surface-soft)' }}>
                <div className="d-flex justify-content-between small mb-1">
                  <span className="fw-semibold">ความสุขของนุ้งเหมียว</span>
                  <span className="text-accent fw-bold">
                    {prefs.happiness ?? 86}% (ปลาทู {prefs.treatsGiven || 0} ตัว)
                  </span>
                </div>
                <div className="progress" style={{ height: 8 }}>
                  <div
                    className="progress-bar"
                    style={{
                      width: `${prefs.happiness ?? 86}%`,
                      background: 'var(--accent-gradient)',
                    }}
                  />
                </div>
                <div className="d-flex flex-wrap gap-1 mt-2">
                  <button type="button" className="btn btn-sm btn-pastel-primary" onClick={handleThrowBall}>
                    🧶 โยนบอลเล่น
                  </button>
                  <button type="button" className="btn btn-sm btn-pastel-soft" onClick={handleGiveTreat}>
                    🐟 ให้ขนมปลาทู
                  </button>
                  <button type="button" className="btn btn-sm btn-pastel-soft" onClick={handlePetCat}>
                    💗 ลูบหัว
                  </button>
                </div>
              </div>

              <div>
                <div className="small fw-semibold text-muted-theme mb-1" style={{ fontSize: '0.75rem' }}>
                  สั่งเปลี่ยนอิริยาบถ ({POSE_LABELS[pose] || 'นั่งรอ'})
                </div>
                <div className="d-flex flex-wrap gap-1">
                  {[
                    { id: 'sit', label: 'นั่งรอ' },
                    { id: 'play', label: 'เล่นบอล' },
                    { id: 'roll', label: 'กลิ้งตัว' },
                    { id: 'sleep', label: 'ฟุบนอน' },
                    { id: 'happy', label: 'ดีใจ' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`btn btn-sm ${pose === p.id ? 'btn-pastel-primary' : 'btn-pastel-soft'}`}
                      onClick={() => handleSelectPose(p.id, 20000)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pt-1 border-top">
                <label htmlFor="meaw-break-select" className="small text-muted-theme mb-0">
                  เตือนพักสายตา/ดื่มน้ำ:
                </label>
                <select
                  id="meaw-break-select"
                  className="form-select form-select-sm w-auto rounded-pill"
                  value={prefs.breakReminderMinutes || 0}
                  onChange={(e) => onUpdatePrefs({ breakReminderMinutes: Number(e.target.value) })}
                >
                  <option value={0}>ปิดไว้</option>
                  <option value={30}>ทุก 30 นาที</option>
                  <option value={45}>ทุก 45 นาที</option>
                  <option value={60}>ทุก 60 นาที</option>
                </select>
              </div>

              <div className="d-flex justify-content-between align-items-center pt-1">
                <button
                  type="button"
                  className="btn btn-sm btn-pastel-soft"
                  onClick={() => {
                    onUpdatePrefs({ position: null });
                    setMicroOffset({ x: 0, y: 0 });
                  }}
                >
                  <i className="bi bi-geo-alt me-1" />
                  กลับมุมขวาล่าง
                </button>
                <span className="text-muted-theme" style={{ fontSize: '0.72rem' }}>
                  ทิป: ลากย้ายที่ • ดับเบิลคลิกลูบหัว
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ข้อความปุยเมฆ */}
      {bubbleVisible && !panelOpen && (
        <div
          className={`meaw-cloud-bubble no-print ${
            layout.bubblePlaceBelow ? 'bubble-below' : 'bubble-above'
          }`}
          style={layout.bubbleStyle}
        >
          <div className="d-flex justify-content-between align-items-start gap-2">
            <span>{bubbleText}</span>
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

      {/* ตัวนุ้งเหมียวที่ลากวางและโต้ตอบได้ */}
      <div
        className="nung-meaw-dock no-print"
        style={{
          left: `${layout.catPos.x}px`,
          top: `${layout.catPos.y}px`,
          width: `${layout.safeBox.w}px`,
          height: `${layout.safeBox.h}px`,
        }}
      >
        <div
          className="nung-meaw-mover"
          style={{
            transform: `translate3d(${microOffset.x}px, ${microOffset.y}px, 0)`,
          }}
        >
          <button
            type="button"
            className={`nung-meaw-figure-btn ${isDragging ? 'is-dragging' : ''}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            title="คลิกเปิดผู้ช่วย • ลากเปลี่ยนตำแหน่ง • ดับเบิลคลิกลูบหัว"
            aria-label="นุ้งเหมียวผู้ช่วยแดชบอร์ด"
          >
            <NungMeawFigure
              pose={pose}
              outfitId={prefs.outfitId}
              headId={prefs.headId}
              eyeId={prefs.eyeId}
              syncOutfitWithTheme={prefs.syncOutfitWithTheme}
              widthScale={anchorFigureSize}
              isDragging={isDragging}
              isExcited={isExcited}
              showHearts={showHearts}
              showTreat={showTreat}
              showBall={showBall}
              statusIcon={
                isSyncing
                  ? 'bi-arrow-repeat'
                  : remainingMinutes > 0 && remainingMinutes <= 10
                    ? 'bi-hourglass-split'
                    : null
              }
            />
          </button>
        </div>
      </div>
    </>
  );
}
