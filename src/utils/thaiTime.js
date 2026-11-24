/**
 * Helper สำหรับจัดการวันเวลาในเขตเวลาประเทศไทย (Asia/Bangkok, GMT+7)
 * ห้ามใช้ .toISOString().split('T') เพื่อป้องกันปัญหาวันที่ถอยหลัง 1 วันช่วง 00:00-06:59 น.
 */

const BANGKOK_TZ = 'Asia/Bangkok';

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const THAI_WEEKDAYS = [
  'อาทิตย์',
  'จันทร์',
  'อังคาร',
  'พุธ',
  'พฤหัสบดี',
  'ศุกร์',
  'เสาร์',
];

export const DAILY_THEMES = [
  { dayIndex: 0, name: 'วันอาทิตย์ — โทนแดงกุหลาบพาสเทล', shortName: 'อาทิตย์', colorHex: '#fb7185' },
  { dayIndex: 1, name: 'วันจันทร์ — โทนเหลืองครีมพาสเทล', shortName: 'จันทร์', colorHex: '#eab308' },
  { dayIndex: 2, name: 'วันอังคาร — โทนชมพูพาสเทล', shortName: 'อังคาร', colorHex: '#f472b6' },
  { dayIndex: 3, name: 'วันพุธ — โทนเขียวมินต์พาสเทล', shortName: 'พุธ', colorHex: '#34d399' },
  { dayIndex: 4, name: 'วันพฤหัสบดี — โทนส้มพีชพาสเทล', shortName: 'พฤหัส', colorHex: '#fb923c' },
  { dayIndex: 5, name: 'วันศุกร์ — โทนฟ้าเบบี้บลูพาสเทล', shortName: 'ศุกร์', colorHex: '#38bdf8' },
  { dayIndex: 6, name: 'วันเสาร์ — โทนม่วงลาเวนเดอร์พาสเทล', shortName: 'เสาร์', colorHex: '#a78bfa' },
];

/**
 * แยกส่วนประกอบของวันเวลาตามเขตเวลา Asia/Bangkok
 */
export function getBangkokDateParts(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    return getBangkokDateParts(new Date());
  }
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BANGKOK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const parts = {};
  for (const part of formatter.formatToParts(d)) {
    if (part.type !== 'literal') {
      parts[part.type] = part.value;
    }
  }
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hourNum = Number(parts.hour) === 24 ? 0 : Number(parts.hour);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: hourNum,
    minute: Number(parts.minute),
    second: Number(parts.second),
    dayOfWeek: weekdayMap[parts.weekday] ?? 0,
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export function getBangkokDayOfWeek(date = new Date()) {
  return getBangkokDateParts(date).dayOfWeek;
}

export function getBangkokNowIso() {
  const p = getBangkokDateParts(new Date());
  const pad = (n) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}+07:00`;
}

/**
 * แปลงสตริงวันที่ (YYYY-MM-DD หรือ YYYY-MM-DD HH:mm:ss) เป็น { year, month, day }
 */
export function parseDateString(dateStr) {
  if (!dateStr) return null;
  const raw = String(dateStr).trim();
  const match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    let year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    // กรณีผู้ใช้เผลอกรอกปี พ.ศ. 4 หลัก (> 2400) แปลงเป็น ค.ศ. เพื่อคำนวณมาตรฐานเดียว
    if (year > 2400) year -= 543;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }
  // รองรับรูปแบบ DD/MM/YYYY
  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    let year = Number(slashMatch[3]);
    if (year > 2400) year -= 543;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }
  return null;
}

export function toDateKey(dateStr) {
  const p = parseDateString(dateStr);
  if (!p) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/**
 * คำนวณปีงบประมาณไทย (พ.ศ.) จากวันที่:
 * 1 ต.ค. - 30 ก.ย. (เดือน >= 10 นับเป็นปีงบประมาณถัดไป)
 * ตัวอย่าง: 2026-10-01 -> ค.ศ. 2026 + 543 + 1 = 2570
 * ตัวอย่าง: 2026-09-30 -> ค.ศ. 2026 + 543 = 2569
 */
export function getThaiFiscalYear(dateStr) {
  const p = parseDateString(dateStr);
  if (!p) return null;
  const beYear = p.year + 543;
  return p.month >= 10 ? beYear + 1 : beYear;
}

/**
 * คำนวณไตรมาสปีงบประมาณไทย (1-4)
 * Q1: ต.ค.-ธ.ค., Q2: ม.ค.-มี.ค., Q3: เม.ย.-มิ.ย., Q4: ก.ค.-ก.ย.
 */
export function getThaiFiscalQuarter(dateStr) {
  const p = parseDateString(dateStr);
  if (!p) return null;
  if (p.month >= 10) return 1;
  if (p.month <= 3) return 2;
  if (p.month <= 6) return 3;
  return 4;
}

export function getDayOfWeekFromDateKey(dateKey) {
  const p = parseDateString(dateKey);
  if (!p) return null;
  // ใช้ UTC noon เพื่อหาค่าวันในสัปดาห์ของปฏิทินโดยไม่ถูก timezone offset เลื่อนวัน
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day, 12, 0, 0));
  return d.getUTCDay();
}

export function getThaiWeekdayLabel(dayIndex) {
  return THAI_WEEKDAYS[dayIndex] || '';
}

export function getThaiMonthLabel(monthNum, short = false) {
  const idx = Number(monthNum) - 1;
  if (idx < 0 || idx > 11) return '';
  return short ? THAI_MONTHS_SHORT[idx] : THAI_MONTHS_FULL[idx];
}

export function formatThaiDate(dateStr, shortMonth = true) {
  const p = parseDateString(dateStr);
  if (!p) return '-';
  const beYear = p.year + 543;
  const mLabel = getThaiMonthLabel(p.month, shortMonth);
  return `${p.day} ${mLabel} ${beYear}`;
}

export function formatThaiMonthYear(yearCe, monthNum, shortMonth = true) {
  const beYear = Number(yearCe) + 543;
  const mLabel = getThaiMonthLabel(monthNum, shortMonth);
  return `${mLabel} ${beYear}`;
}

export function formatThaiDateTime(dateOrIso) {
  if (!dateOrIso) return 'ยังไม่มีข้อมูลการดึงล่าสุด';
  const d = dateOrIso instanceof Date ? dateOrIso : new Date(dateOrIso);
  if (Number.isNaN(d.getTime())) return String(dateOrIso);
  const p = getBangkokDateParts(d);
  const pad = (n) => String(n).padStart(2, '0');
  const beYear = p.year + 543;
  return `${p.day} ${getThaiMonthLabel(p.month, true)} ${beYear} เวลา ${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)} น.`;
}

/**
 * คำนวณจำนวนวันส่วนต่างระหว่าง วันที่ดำเนินการ กับ ประทับเวลา (เพื่อตรวจสอบการบันทึกย้อนหลัง)
 */
export function diffDays(opDateStr, timestampStr) {
  const op = parseDateString(opDateStr);
  const ts = parseDateString(timestampStr);
  if (!op || !ts) return 0;
  const opMs = Date.UTC(op.year, op.month - 1, op.day);
  const tsMs = Date.UTC(ts.year, ts.month - 1, ts.day);
  return Math.round((tsMs - opMs) / 86400000);
}
