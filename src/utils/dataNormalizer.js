/**
 * ตัวแปลงและทำความสะอาดข้อมูลจาก Google Sheets ทั้ง 2 แหล่ง:
 * 1. รายการสนับสนุนส่งสิ่งส่งตรวจทางห้องปฏิบัติการ (lab)
 * 2. ทะเบียนเบิกยาที่ไม่มีใช้ใน รพ.สต. (drug)
 *
 * รองรับหัวคอลัมน์ที่มีช่องว่างซ้ำและลำดับคอลัมน์สิทธิที่สลับกันระหว่าง 2 ชีท
 */

import {
  diffDays,
  getDayOfWeekFromDateKey,
  getThaiFiscalQuarter,
  getThaiFiscalYear,
  parseDateString,
  toDateKey,
} from './thaiTime.js';

export const ENTITLEMENT_FIELDS = [
  { key: 'ucNkp', label: 'UC นครพิงค์', shortLabel: 'UC นครพิงค์', color: '#f472b6' },
  { key: 'ucMaesa', label: 'UC แม่สา', shortLabel: 'UC แม่สา', color: '#fb7185' },
  { key: 'ucKhajao', label: 'UC ขะจาว', shortLabel: 'UC ขะจาว', color: '#c084fc' },
  { key: 'sso', label: 'ประกันสังคม', shortLabel: 'ประกันสังคม', color: '#38bdf8' },
  { key: 'civilServant', label: 'ข้าราชการ', shortLabel: 'ข้าราชการ', color: '#34d399' },
  { key: 'selfPay', label: 'ชำระเงินเอง', shortLabel: 'ชำระเงินเอง', color: '#fbbf24' },
  { key: 'statusProblem', label: 'มีปัญหาสถานะทางสิทธิ์', shortLabel: 'ปัญหาสิทธิ์', color: '#fb923c' },
  { key: 'welfare', label: 'อนุเคราะห์', shortLabel: 'อนุเคราะห์', color: '#94a3b8' },
];

function cleanHeader(header) {
  return String(header || '').replace(/\s+/g, ' ').trim();
}

function parseNumericCell(val) {
  if (val === null || val === undefined) return 0;
  const s = String(val).trim();
  if (!s || s === '-' || s === '—' || s === '–') return 0;
  const cleaned = s.replace(/,/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function findFieldValue(normalizedObj, predicates) {
  for (const [k, v] of Object.entries(normalizedObj)) {
    for (const pred of predicates) {
      if (pred(k)) return v;
    }
  }
  return '';
}

function extractEntitlements(normalizedObj) {
  return {
    ucNkp: parseNumericCell(
      findFieldValue(normalizedObj, [(k) => k.includes('UC') && k.includes('นครพิงค์')])
    ),
    ucMaesa: parseNumericCell(
      findFieldValue(normalizedObj, [(k) => k.includes('UC') && k.includes('แม่สา')])
    ),
    ucKhajao: parseNumericCell(
      findFieldValue(normalizedObj, [(k) => k.includes('UC') && k.includes('ขะจาว')])
    ),
    sso: parseNumericCell(
      findFieldValue(normalizedObj, [(k) => k.includes('ประกันสังคม')])
    ),
    civilServant: parseNumericCell(
      findFieldValue(normalizedObj, [(k) => k.includes('ข้าราชการ')])
    ),
    selfPay: parseNumericCell(
      findFieldValue(normalizedObj, [(k) => k.includes('ชำระเงินเอง')])
    ),
    statusProblem: parseNumericCell(
      findFieldValue(normalizedObj, [(k) => k.includes('ปัญหาสถานะ')])
    ),
    welfare: parseNumericCell(
      findFieldValue(normalizedObj, [(k) => k.includes('อนุเคราะห์')])
    ),
  };
}

export function normalizeDatasetRows(rawRows, datasetType) {
  if (!Array.isArray(rawRows)) return [];

  return rawRows
    .map((raw, index) => {
      const normalizedObj = {};
      for (const [k, v] of Object.entries(raw || {})) {
        normalizedObj[cleanHeader(k)] = v;
      }

      const unitName = String(
        findFieldValue(normalizedObj, [(k) => k.includes('รายชื่อ') || k.includes('รพ.สต')])
      )
        .replace(/\s+/g, ' ')
        .trim();

      if (!unitName) return null;

      const timestamp = String(
        findFieldValue(normalizedObj, [(k) => k.includes('ประทับเวลา')])
      ).trim();

      const rawOpDate = String(
        findFieldValue(normalizedObj, [(k) => k.includes('วันที่ดำเนินการ')])
      ).trim();

      const operationDate = toDateKey(rawOpDate) || toDateKey(timestamp);
      const parsedDate = parseDateString(operationDate);
      if (!parsedDate) return null;

      const serviceModeRaw =
        datasetType === 'lab'
          ? findFieldValue(normalizedObj, [(k) => k.includes('ลักษณะการส่งสิ่งส่งตรวจ')])
          : findFieldValue(normalizedObj, [(k) => k.includes('ลักษณะการรับยา')]);

      const serviceMode = String(serviceModeRaw || 'ไม่ระบุ').replace(/\s+/g, ' ').trim();
      const entitlements = extractEntitlements(normalizedObj);
      const computedTotal = ENTITLEMENT_FIELDS.reduce(
        (sum, f) => sum + (entitlements[f.key] || 0),
        0
      );
      const reportedTotalRaw = findFieldValue(normalizedObj, [(k) => k === 'รวม' || k.startsWith('รวม')]);
      const reportedTotal = parseNumericCell(reportedTotalRaw);
      const total = reportedTotal > 0 ? reportedTotal : computedTotal;
      const hasMismatch = reportedTotalRaw !== '' && reportedTotal !== computedTotal;

      const fiscalYear = getThaiFiscalYear(operationDate);
      const quarter = getThaiFiscalQuarter(operationDate);
      const dayOfWeek = getDayOfWeekFromDateKey(operationDate);
      const lagDays = diffDays(operationDate, timestamp);

      return {
        id: `${datasetType}-${index}-${operationDate}`,
        datasetType, // 'lab' | 'drug'
        datasetLabel: datasetType === 'lab' ? 'ส่งสิ่งส่งตรวจ (Lab)' : 'เบิกยา รพ.สต.',
        timestamp,
        operationDate,
        yearCe: parsedDate.year,
        month: parsedDate.month,
        day: parsedDate.day,
        monthKey: `${parsedDate.year}-${String(parsedDate.month).padStart(2, '0')}`,
        fiscalYear,
        quarter,
        dayOfWeek,
        lagDays,
        unitName,
        serviceMode,
        entitlements,
        computedTotal,
        reportedTotal,
        total,
        hasMismatch,
      };
    })
    .filter(Boolean);
}

export function normalizeAllData(labRawRows, drugRawRows) {
  const labRecords = normalizeDatasetRows(labRawRows, 'lab');
  const drugRecords = normalizeDatasetRows(drugRawRows, 'drug');
  const allRecords = [...labRecords, ...drugRecords].sort((a, b) =>
    b.operationDate.localeCompare(a.operationDate)
  );
  return {
    labRecords,
    drugRecords,
    allRecords,
  };
}
