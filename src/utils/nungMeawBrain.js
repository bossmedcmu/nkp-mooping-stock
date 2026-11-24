/**
 * สมองและความสามารถเสริมของนุ้งเหมียว (ชุดแต่งกาย, เสียงสังเคราะห์, ความจำค่าตั้งค่า, และผู้ช่วยตอบคำถามข้อมูล)
 */

export const NUNG_MEAW_PREFS_KEY = 'nkp_pcu_nung_meaw_prefs_v2';

export const OUTFIT_ITEMS = [
  { id: 'none', label: 'ตัวเปล่า', icon: 'bi-stars' },
  { id: 'labcoat', label: 'เสื้อกาวน์ รพ.สต.', icon: 'bi-heart-pulse' },
  { id: 'hoodie', label: 'ฮู้ดพาสเทล', icon: 'bi-emoji-smile' },
  { id: 'pajama', label: 'ชุดนอนลายดาว', icon: 'bi-moon-stars' },
  { id: 'cape', label: 'ผ้าคลุมซุปเปอร์เหมียว', icon: 'bi-lightning-charge' },
  { id: 'scarf', label: 'ผ้าพันคออุ่น', icon: 'bi-snow' },
];

export const HEAD_ACCESSORY_ITEMS = [
  { id: 'none', label: 'ไม่ใส่หมวก/โบว์' },
  { id: 'bow', label: 'โบว์สีหวาน' },
  { id: 'cap', label: 'หมวกเจ้าหน้าที่' },
  { id: 'beanie', label: 'หมวกไหมพรม' },
  { id: 'flower', label: 'ดอกไม้ทัดหู' },
  { id: 'crown', label: 'มงกุฎจิ๋ว' },
];

export const EYE_ACCESSORY_ITEMS = [
  { id: 'none', label: 'ปกติ' },
  { id: 'round', label: 'แว่นกลม' },
  { id: 'sunglasses', label: 'แว่นกันแดด' },
  { id: 'blush', label: 'แก้มแดง' },
];

export const POSE_LABELS = {
  sit: 'นั่งรอช่วยงาน',
  play: 'เล่นลูกบอล',
  roll: 'กลิ้งหงายท้อง',
  sleep: 'ฟุบนอนหลับ',
  happy: 'ดีใจ / โดนอุ้ม',
  peek: 'แอบส่องข้อมูล',
};

export const DEFAULT_NUNG_MEAW_PREFS = {
  outfitId: 'none',
  headId: 'none',
  eyeId: 'none',
  syncOutfitWithTheme: true,
  soundEnabled: true,
  minimized: false,
  breakReminderMinutes: 0,
  happiness: 86,
  treatsGiven: 0,
  position: null, // { x, y } จากมุมบนซ้าย หรือ null = มุมขวาล่างค่าเริ่มต้น
};

export function loadNungMeawPrefs() {
  try {
    const raw = localStorage.getItem(NUNG_MEAW_PREFS_KEY);
    if (!raw) return { ...DEFAULT_NUNG_MEAW_PREFS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_NUNG_MEAW_PREFS,
      ...parsed,
      happiness: Math.max(0, Math.min(100, Number(parsed?.happiness ?? 86))),
      treatsGiven: Math.max(0, Number(parsed?.treatsGiven ?? 0)),
      breakReminderMinutes: Math.max(0, Number(parsed?.breakReminderMinutes ?? 0)),
    };
  } catch {
    return { ...DEFAULT_NUNG_MEAW_PREFS };
  }
}

export function saveNungMeawPrefs(prefs) {
  try {
    localStorage.setItem(NUNG_MEAW_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage quota or private mode restrictions
  }
}

let sharedAudioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new Ctx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * สร้างเสียงเหมียวเบาๆ แบบสังเคราะห์ในเบราว์เซอร์ (ไม่พึ่งไฟล์เสียงภายนอก)
 */
export function playMeowSound(kind = 'meow', enabled = true) {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (kind === 'happy') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);
      osc.frequency.exponentialRampToValueAtTime(1040, now + 0.18);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.23);
      return;
    }

    if (kind === 'purr') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.linearRampToValueAtTime(340, now + 0.12);
      osc.frequency.linearRampToValueAtTime(240, now + 0.25);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.045, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);
      osc.start(now);
      osc.stop(now + 0.28);
      return;
    }

    if (kind === 'boing') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(380, now + 0.16);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.055, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.19);
      return;
    }

    if (kind === 'alert') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(740, now);
      osc.frequency.setValueAtTime(980, now + 0.11);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.29);
      return;
    }

    // ค่าเริ่มต้น: เสียงร้อง "เหมียว~" นุ่มนวล
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(510, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.09);
    osc.frequency.exponentialRampToValueAtTime(430, now + 0.24);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.start(now);
    osc.stop(now + 0.27);
  } catch {
    // ignore audio playback restriction
  }
}

/**
 * ตอบคำถามข้อมูลแดชบอร์ดแบบภาษาคนจากข้อมูล analytics ที่กรองไว้ปัจจุบัน
 */
export function answerMascotQuestion(rawQuery, analytics, context = {}) {
  const query = String(rawQuery || '').trim();
  const q = query.toLowerCase();
  const summary = analytics?.summary || {};
  const byUnit = analytics?.byUnit || [];
  const byMonth = analytics?.byMonth || [];
  const byDay = analytics?.byDay || [];
  const byWeekday = analytics?.byWeekday || [];
  const entitlementSummary = analytics?.entitlementSummary || [];
  const recs = analytics?.insights?.recommendations || [];
  const pareto = analytics?.deepAnalytics?.paretoSummary;

  if (!q) {
    return {
      text: 'พิมพ์คำถามมาได้เลยเหมียว~ เช่น "รพ.สต.ไหนเยอะสุด", "เทียบ Lab กับ ยา", "สิทธิ UC เท่าไหร่", หรือ "เดือนไหนสูงสุด"',
    };
  }

  if (!summary.totalSessions) {
    return {
      text: 'แง้ว~ ตอนนี้ยังไม่มีข้อมูลในตัวกรองที่เลือก ลองล้างตัวกรองหรือกด "ดึงข้อมูลล่าสุด" ก่อนนะเหมียว',
      action: { label: 'ล้างตัวกรอง', type: 'resetFilters' },
    };
  }

  // 1) ค้นหาชื่อ รพ.สต. เฉพาะเจาะจงในคำถาม
  const matchedUnit = byUnit.find(
    (u) =>
      u.unitName.toLowerCase() === q ||
      (q.length >= 3 && u.unitName.toLowerCase().includes(q)) ||
      (u.unitName.length >= 4 && q.includes(u.unitName.toLowerCase()))
  );
  if (matchedUnit) {
    return {
      text: `เจาะลึก "${matchedUnit.unitName}": รวม ${matchedUnit.totalPatients.toLocaleString()} ราย (${matchedUnit.totalSessions} ครั้ง) — ส่งตรวจ Lab ${matchedUnit.labPatients.toLocaleString()} ราย, เบิกยา ${matchedUnit.drugPatients.toLocaleString()} ราย (บันทึกล่าช้า ${matchedUnit.delayedCount || 0} ครั้ง)`,
      action: {
        label: `ดูรายละเอียด ${matchedUnit.unitName}`,
        type: 'unit',
        payload: matchedUnit.unitName,
      },
    };
  }

  // 2) คำถามเรื่องหน่วยบริการสูงสุด / อันดับต้น
  if (/(เยอะสุด|มากสุด|สูงสุด|อันดับ|top|นำโด่ง|รพ\.สต\.ไหน)/i.test(q) && !/(เดือน|วัน|ไตรมาส)/i.test(q)) {
    const top3 = byUnit.slice(0, 3);
    const listText = top3
      .map((u, idx) => `${idx + 1}. ${u.unitName} (${u.totalPatients.toLocaleString()} ราย)`)
      .join(' | ');
    return {
      text: `3 อันดับ รพ.สต. ที่มียอดผู้รับบริการสูงสุด: ${listText}`,
      action: top3[0]
        ? { label: `เจาะลึก ${top3[0].unitName}`, type: 'unit', payload: top3[0].unitName }
        : undefined,
    };
  }

  // 3) คำถามเรื่องหน่วยบริการน้อยสุด
  if (/(น้อยสุด|ต่ำสุด|รั้งท้าย)/i.test(q) && byUnit.length > 0) {
    const sortedAsc = [...byUnit].sort((a, b) => a.totalPatients - b.totalPatients);
    const lowest = sortedAsc[0];
    return {
      text: `หน่วยบริการที่มียอดน้อยที่สุดในตัวกรองนี้คือ "${lowest.unitName}" จำนวน ${lowest.totalPatients.toLocaleString()} ราย (${lowest.totalSessions} ครั้ง)`,
      action: { label: `ดู ${lowest.unitName}`, type: 'unit', payload: lowest.unitName },
    };
  }

  // 4) คำถามเปรียบเทียบ Lab กับ ยา
  if (/(lab|แล็บ|ตรวจ|เบิกยา|ยา|เทียบ|สัดส่วน)/i.test(q)) {
    const total = summary.totalPatients || 1;
    const labPct = ((summary.labPatients / total) * 100).toFixed(1);
    const drugPct = ((summary.drugPatients / total) * 100).toFixed(1);
    const topLabMode = analytics?.labModes?.[0];
    const topDrugMode = analytics?.drugModes?.[0];
    return {
      text: `งานส่งตรวจ Lab มี ${summary.labPatients.toLocaleString()} ราย (${labPct}%) และทะเบียนเบิกยา ${summary.drugPatients.toLocaleString()} ราย (${drugPct}%)${topLabMode ? ` • Lab เด่นสุด: ${topLabMode.mode}` : ''}${topDrugMode ? ` • ยาเด่นสุด: ${topDrugMode.mode}` : ''}`,
      action: { label: 'ดูกราฟภาพรวม', type: 'tab', payload: 'overview' },
    };
  }

  // 5) คำถามเรื่องสิทธิการรักษา / กลุ่มเปราะบาง
  if (/(สิทธิ|uc|บัตรทอง|ข้าราชการ|ประกันสังคม|อปท|ต่างด้าว|อนุเคราะห์|จ่ายเอง|เปราะบาง)/i.test(q)) {
    const specific = entitlementSummary.find((e) => {
      const lbl = `${e.label} ${e.shortLabel}`.toLowerCase();
      if (/uc|บัตรทอง/.test(q) && /uc/.test(lbl)) return true;
      if (/ข้าราชการ/.test(q) && /ข้าราชการ/.test(lbl)) return true;
      if (/ประกันสังคม/.test(q) && /ประกันสังคม/.test(lbl)) return true;
      if (/อปท/.test(q) && /อปท/.test(lbl)) return true;
      if (/ต่างด้าว/.test(q) && /ต่างด้าว/.test(lbl)) return true;
      if (/อนุเคราะห์/.test(q) && /อนุเคราะห์/.test(lbl)) return true;
      if (/จ่ายเอง|ชำระเอง/.test(q) && /ชำระ/.test(lbl)) return true;
      return false;
    });
    if (specific) {
      return {
        text: `สิทธิ "${specific.label}" มีจำนวน ${specific.total.toLocaleString()} ราย คิดเป็น ${specific.pct}% ของยอดรวมทั้งหมดในตัวกรองนี้`,
      };
    }
    const topEnt = entitlementSummary[0];
    return {
      text: `สิทธิอันดับ 1 คือ "${topEnt?.label || '-'}" จำนวน ${(topEnt?.total || 0).toLocaleString()} ราย (${topEnt?.pct || 0}%) และกลุ่มเปราะบาง (ผู้พิการ/ผู้สูงอายุ/อนุเคราะห์) รวม ${(summary.vulnerablePatients || 0).toLocaleString()} ราย`,
    };
  }

  // 6) คำถามเรื่องช่วงเวลา เดือน/วัน/ไตรมาสที่พีคสุด
  if (/(เดือน|วัน|ไตรมาส|ช่วงไหน|พีค|เวลา)/i.test(q)) {
    const peakMonth = [...byMonth].sort((a, b) => b.totalPatients - a.totalPatients)[0];
    const peakDay = [...byDay].sort((a, b) => b.totalPatients - a.totalPatients)[0];
    const peakWeekday = [...byWeekday].sort((a, b) => (b.patients || 0) - (a.patients || 0))[0];
    return {
      text: `ช่วงพีคสุดในตัวกรองนี้: เดือน ${peakMonth?.label || '-'} (${(peakMonth?.totalPatients || 0).toLocaleString()} ราย), วันในสัปดาห์ที่คึกคักสุดคือ "${peakWeekday?.label || '-'}"${peakDay ? ` และวันที่ยอดสูงสุดคือ ${peakDay.dateLabel} (${peakDay.totalPatients.toLocaleString()} ราย)` : ''}`,
      action: { label: 'ดูรายงานรายวัน/เดือน', type: 'tab', payload: 'time' },
    };
  }

  // 7) คำถามเรื่องจุดผิดปกติ / ล่าช้า / แนวทางแก้ไข / Pareto
  if (/(ปัญหา|ผิดปกติ|ล่าช้า|ติดตาม|แนะนำ|แก้|pareto|tier|คุณภาพ)/i.test(q)) {
    const topRec = recs[0];
    const paretoText = pareto
      ? ` กฎ 80/20: ${pareto.coreUnitCount} แห่งแรกสร้างภาระงานถึง ${pareto.coreSharePct}%`
      : '';
    return {
      text: `พบรายการบันทึกล่าช้าเกิน 1 วัน ${summary.delayedCount || 0} ครั้ง, ยอดไม่ตรงผลรวมย่อย ${summary.mismatchCount || 0} ครั้ง.${paretoText}${topRec ? ` จุดสำคัญ: [${topRec.category}] ${topRec.finding}` : ''}`,
      action: { label: 'เปิดหน้าวิเคราะห์เชิงลึก', type: 'tab', payload: 'deep' },
    };
  }

  // 8) คำถามเรื่องเวลาคงเหลือ / สถานะข้อมูล
  if (/(เวลา|หมดอายุ|นาที|60|ซิงค์|อัปเดต)/i.test(q)) {
    return {
      text: context.remainingMinutes
        ? `ข้อมูลชุดปัจจุบันจะคงอยู่ชั่วคราวอีกประมาณ ${context.remainingMinutes} นาที (จำกัด 60 นาทีเพื่อความปลอดภัยของข้อมูล)`
        : 'ตอนนี้ยังไม่มีข้อมูลชั่วคราวที่นับเวลาถอยหลังอยู่ กด "ดึงข้อมูลใหม่" เพื่ออัปเดตได้ตลอดเลยเหมียว',
    };
  }

  // 9) สรุปรวมทั่วไป
  if (/(สรุป|ทั้งหมด|ยอด|กี่ราย|กี่คน|กี่แห่ง|ภาพรวม)/i.test(q)) {
    return {
      text: `สรุปภาพรวม (${summary.dateRangeStart} – ${summary.dateRangeEnd}): ผู้รับบริการรวม ${summary.totalPatients.toLocaleString()} ราย (${summary.totalSessions} ครั้ง) จาก ${summary.activeUnitsCount} รพ.สต. (Lab ${summary.labPatients.toLocaleString()} / เบิกยา ${summary.drugPatients.toLocaleString()})`,
      action: { label: 'พิมพ์รายงาน A4', type: 'print' },
    };
  }

  return {
    text: `เหมียวยังไม่แน่ใจคำถาม "${query}" ลองถามสั้นๆ เช่น "รพ.สต.ไหนเยอะสุด", "เทียบ Lab กับ ยา", "สิทธิ UC เท่าไหร่", "เดือนไหนพีคสุด" หรือพิมพ์ชื่อ รพ.สต. ได้เลยนะเหมียว~`,
  };
}

export function getMascotSafeBox(isMobile = false) {
  return isMobile ? { w: 112, h: 128 } : { w: 140, h: 158 };
}

export function clampMascotPosition(pos, viewport = { w: 1200, h: 800 }, isMobile = false) {
  const margin = 16;
  const box = getMascotSafeBox(isMobile);
  const maxX = Math.max(margin, viewport.w - box.w - margin);
  const maxY = Math.max(margin, viewport.h - box.h - margin);
  const defaultPos = { x: maxX, y: maxY };
  if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') {
    return defaultPos;
  }
  return {
    x: Math.max(margin, Math.min(maxX, Math.round(pos.x))),
    y: Math.max(margin, Math.min(maxY, Math.round(pos.y))),
  };
}

/**
 * คำนวณพิกัดของตัวนุ้งเหมียว กรอบแผงผู้ช่วย และปุยเมฆข้อความแบบ fixed แยกจากกัน
 * เพื่อให้ทั้งตัวนุ้งเหมียวและกรอบไม่ล้นขอบหน้าจอทุกขนาดและทุกมุมที่ลากไปวาง
 */
export function computeMascotLayout(savedPos, viewport = { w: 1200, h: 800 }) {
  const vw = Math.max(320, viewport.w || 1200);
  const vh = Math.max(360, viewport.h || 800);
  const isMobile = vw <= 576;
  const margin = 12;
  const safeBox = getMascotSafeBox(isMobile);
  const catPos = clampMascotPosition(savedPos, { w: vw, h: vh }, isMobile);
  const catCenterX = catPos.x + safeBox.w / 2;

  // คำนวณกรอบแผงผู้ช่วย (.meaw-panel) ให้ไม่ล้นขอบจอทั้ง 4 ด้าน
  const panelWidth = Math.min(372, vw - margin * 2);
  const preferredPanelLeft =
    catCenterX > vw / 2 ? catPos.x + safeBox.w - panelWidth : catPos.x;
  const panelLeft = Math.max(margin, Math.min(vw - panelWidth - margin, Math.round(preferredPanelLeft)));

  const spaceAbove = Math.max(0, catPos.y - margin - 10);
  const spaceBelow = Math.max(0, vh - (catPos.y + safeBox.h) - margin - 10);
  let panelStyle;
  if (Math.max(spaceAbove, spaceBelow) >= 240) {
    if (spaceBelow > spaceAbove) {
      panelStyle = {
        left: `${panelLeft}px`,
        top: `${catPos.y + safeBox.h + 10}px`,
        width: `${panelWidth}px`,
        maxHeight: `${Math.min(500, spaceBelow)}px`,
      };
    } else {
      panelStyle = {
        left: `${panelLeft}px`,
        bottom: `${vh - catPos.y + 10}px`,
        width: `${panelWidth}px`,
        maxHeight: `${Math.min(500, spaceAbove)}px`,
      };
    }
  } else {
    // กรณีจอเตี้ยมากและนุ้งเหมียวอยู่กลางจอ ให้ยึดขอบบนหรือขอบล่างที่ไกลจากตัวแมวที่สุด
    const maxHeight = Math.min(460, vh - margin * 2);
    panelStyle =
      catPos.y > vh / 2
        ? { left: `${panelLeft}px`, top: `${margin}px`, width: `${panelWidth}px`, maxHeight: `${maxHeight}px` }
        : { left: `${panelLeft}px`, bottom: `${margin}px`, width: `${panelWidth}px`, maxHeight: `${maxHeight}px` };
  }

  // คำนวณปุยเมฆข้อความ (.meaw-cloud-bubble) ให้ไม่ล้นขอบจอและหางชี้ตรงตัวนุ้งเหมียว
  const bubbleWidth = Math.min(265, vw - margin * 2);
  const preferredBubbleLeft =
    catCenterX > vw / 2 ? catPos.x + safeBox.w - bubbleWidth : catPos.x;
  const bubbleLeft = Math.max(margin, Math.min(vw - bubbleWidth - margin, Math.round(preferredBubbleLeft)));
  const bubblePlaceBelow = catPos.y < 130;
  const tailLeft = Math.max(20, Math.min(bubbleWidth - 38, Math.round(catCenterX - bubbleLeft - 9)));

  const bubbleStyle = bubblePlaceBelow
    ? {
        left: `${bubbleLeft}px`,
        top: `${catPos.y + safeBox.h + 8}px`,
        maxWidth: `${bubbleWidth}px`,
        '--meaw-tail-left': `${tailLeft}px`,
      }
    : {
        left: `${bubbleLeft}px`,
        bottom: `${vh - catPos.y + 8}px`,
        maxWidth: `${bubbleWidth}px`,
        '--meaw-tail-left': `${tailLeft}px`,
      };

  return {
    isMobile,
    safeBox,
    catPos,
    panelStyle,
    bubbleStyle,
    bubblePlaceBelow,
  };
}
