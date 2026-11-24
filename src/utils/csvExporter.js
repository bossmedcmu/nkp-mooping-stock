/**
 * เครื่องมือส่งออกตารางข้อมูลเป็นไฟล์ CSV รองรับภาษาไทย (UTF-8 BOM)
 * และป้องกัน CSV Formula Injection
 */

import { ENTITLEMENT_FIELDS } from './dataNormalizer.js';

export function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  let str = String(value);
  if (/^\s*[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvLines(headers, rows) {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const bodyLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  return `\uFEFF${[headerLine, ...bodyLines].join('\r\n')}`;
}

export function buildUnitSummaryCsv(byUnit = []) {
  const headers = [
    'ลำดับ',
    'รายชื่อ รพ.สต. / หน่วยบริการ',
    'จำนวนครั้งรวม',
    'ส่งตรวจ Lab (ครั้ง)',
    'ส่งตรวจ Lab (ราย)',
    'เบิกยา (ครั้ง)',
    'เบิกยา (ราย)',
    ...ENTITLEMENT_FIELDS.map((f) => f.label),
    'ผู้รับบริการรวม (ราย)',
    'เฉลี่ย (ราย/ครั้ง)',
    'บันทึกล่าช้าเกิน 1 วัน (ครั้ง)',
  ];

  const rows = byUnit.map((u, idx) => [
    idx + 1,
    u.unitName,
    u.totalSessions,
    u.labSessions,
    u.labPatients,
    u.drugSessions,
    u.drugPatients,
    ...ENTITLEMENT_FIELDS.map((f) => u.entitlements?.[f.key] || 0),
    u.totalPatients,
    u.avgPatientsPerSession,
    u.delayedCount || 0,
  ]);

  return toCsvLines(headers, rows);
}

export function buildRawRecordsCsv(records = []) {
  const headers = [
    'วันที่ดำเนินการ',
    'วันประทับเวลา',
    'ปีงบประมาณ',
    'ไตรมาส',
    'ประเภทงาน',
    'รายชื่อ รพ.สต. / หน่วยบริการ',
    'ลักษณะบริการ',
    ...ENTITLEMENT_FIELDS.map((f) => f.label),
    'รวมตามคอลัมน์ (ราย)',
    'ผลรวม 8 สิทธิ (ราย)',
    'ส่วนต่างยอดรวม',
    'ล่าช้าในการบันทึก (วัน)',
  ];

  const rows = records.map((r) => [
    r.operationDate,
    r.timestamp || '-',
    r.fiscalYear,
    `Q${r.quarter}`,
    r.datasetLabel,
    r.unitName,
    r.serviceMode,
    ...ENTITLEMENT_FIELDS.map((f) => r.entitlements?.[f.key] || 0),
    r.total,
    r.computedTotal,
    r.hasMismatch ? r.reportedTotal - r.computedTotal : 0,
    r.lagDays,
  ]);

  return toCsvLines(headers, rows);
}

export function downloadCsvFile(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
