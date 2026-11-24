/**
 * เครื่องมือวิเคราะห์ข้อมูลทุกมิติสำหรับ Dashboard และรายงาน A4
 * รองรับการวิเคราะห์แยก Lab / ยา / รวม, ราย รพ.สต., รายวัน, รายเดือน, รายไตรมาส, รายปีงบประมาณ, 8 สิทธิ และข้อเสนอแนะ
 */

import { ENTITLEMENT_FIELDS } from './dataNormalizer.js';
import {
  formatThaiDate,
  formatThaiMonthYear,
  getThaiMonthLabel,
  getThaiWeekdayLabel,
} from './thaiTime.js';

const FISCAL_MONTH_ORDER = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function createEmptyEntitlements() {
  const obj = {};
  for (const f of ENTITLEMENT_FIELDS) obj[f.key] = 0;
  return obj;
}

function addEntitlements(target, source) {
  for (const f of ENTITLEMENT_FIELDS) {
    target[f.key] += source[f.key] || 0;
  }
}

export function extractFiscalYears(records) {
  const years = new Set();
  for (const r of records) {
    if (r.fiscalYear) years.add(r.fiscalYear);
  }
  return Array.from(years).sort((a, b) => b - a);
}

export function extractUnitNames(records) {
  const units = new Set();
  for (const r of records) {
    if (r.unitName) units.add(r.unitName);
  }
  return Array.from(units).sort((a, b) => a.localeCompare(b, 'th'));
}

export function filterRecords(records, filters = {}) {
  const {
    fiscalYear = 'ALL',
    datasetMode = 'ALL', // 'ALL' | 'lab' | 'drug'
    unitName = 'ALL',
    quarter = 'ALL',
    month = 'ALL',
    search = '',
  } = filters;

  const q = String(search || '').trim().toLowerCase();

  return records.filter((r) => {
    if (fiscalYear !== 'ALL' && Number(r.fiscalYear) !== Number(fiscalYear)) return false;
    if (datasetMode !== 'ALL' && r.datasetType !== datasetMode) return false;
    if (unitName !== 'ALL' && r.unitName !== unitName) return false;
    if (quarter !== 'ALL' && Number(r.quarter) !== Number(quarter)) return false;
    if (month !== 'ALL' && Number(r.month) !== Number(month)) return false;
    if (q) {
      const hay = `${r.unitName} ${r.serviceMode} ${r.operationDate} ${r.datasetLabel}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function computeAnalytics(allRecords, filters = {}) {
  const filtered = filterRecords(allRecords, filters);

  const summary = {
    totalPatients: 0,
    totalSessions: filtered.length,
    labPatients: 0,
    labSessions: 0,
    drugPatients: 0,
    drugSessions: 0,
    activeUnitsCount: 0,
    avgPatientsPerSession: 0,
    mismatchCount: 0,
    delayedCount: 0,
    vulnerablePatients: 0,
    dateRangeStart: '',
    dateRangeEnd: '',
  };

  const entitlementTotalsAll = createEmptyEntitlements();
  const entitlementTotalsLab = createEmptyEntitlements();
  const entitlementTotalsDrug = createEmptyEntitlements();

  const unitMap = new Map();
  const dayMap = new Map();
  const monthMap = new Map();
  const quarterMap = new Map();
  const fiscalYearMap = new Map();
  const weekdayMap = new Map();
  const labModeMap = new Map();
  const drugModeMap = new Map();

  for (let d = 0; d < 7; d++) {
    weekdayMap.set(d, {
      dayIndex: d,
      label: getThaiWeekdayLabel(d),
      sessions: 0,
      patients: 0,
      labPatients: 0,
      drugPatients: 0,
    });
  }

  let minDate = '';
  let maxDate = '';

  for (const r of filtered) {
    summary.totalPatients += r.total;
    if (r.hasMismatch) summary.mismatchCount += 1;
    if (r.lagDays > 1) summary.delayedCount += 1;
    summary.vulnerablePatients +=
      (r.entitlements.statusProblem || 0) + (r.entitlements.welfare || 0);

    if (!minDate || r.operationDate < minDate) minDate = r.operationDate;
    if (!maxDate || r.operationDate > maxDate) maxDate = r.operationDate;

    addEntitlements(entitlementTotalsAll, r.entitlements);

    if (r.datasetType === 'lab') {
      summary.labPatients += r.total;
      summary.labSessions += 1;
      addEntitlements(entitlementTotalsLab, r.entitlements);

      if (!labModeMap.has(r.serviceMode)) {
        labModeMap.set(r.serviceMode, { mode: r.serviceMode, sessions: 0, patients: 0 });
      }
      const lm = labModeMap.get(r.serviceMode);
      lm.sessions += 1;
      lm.patients += r.total;
    } else {
      summary.drugPatients += r.total;
      summary.drugSessions += 1;
      addEntitlements(entitlementTotalsDrug, r.entitlements);

      if (!drugModeMap.has(r.serviceMode)) {
        drugModeMap.set(r.serviceMode, { mode: r.serviceMode, sessions: 0, patients: 0 });
      }
      const dm = drugModeMap.get(r.serviceMode);
      dm.sessions += 1;
      dm.patients += r.total;
    }

    // Group by Unit (รพ.สต.)
    if (!unitMap.has(r.unitName)) {
      unitMap.set(r.unitName, {
        unitName: r.unitName,
        totalPatients: 0,
        totalSessions: 0,
        labPatients: 0,
        labSessions: 0,
        drugPatients: 0,
        drugSessions: 0,
        yearlyLabPatients: 0,
        fuLabPatients: 0,
        postalDrugSessions: 0,
        postalDrugPatients: 0,
        selfPickupDrugSessions: 0,
        delayedCount: 0,
        entitlements: createEmptyEntitlements(),
        serviceModes: new Set(),
        records: [],
      });
    }
    const u = unitMap.get(r.unitName);
    u.totalPatients += r.total;
    u.totalSessions += 1;
    addEntitlements(u.entitlements, r.entitlements);
    u.serviceModes.add(r.serviceMode);
    if (r.lagDays > 1) u.delayedCount += 1;
    u.records.push(r);
    if (r.datasetType === 'lab') {
      u.labPatients += r.total;
      u.labSessions += 1;
      if (r.serviceMode.toLowerCase().includes('yearly')) u.yearlyLabPatients += r.total;
      if (r.serviceMode.toLowerCase().includes('f/u')) u.fuLabPatients += r.total;
    } else {
      u.drugPatients += r.total;
      u.drugSessions += 1;
      if (r.serviceMode.includes('019') || r.serviceMode.includes('ไปรษณีย์')) {
        u.postalDrugSessions += 1;
        u.postalDrugPatients += r.total;
      } else {
        u.selfPickupDrugSessions += 1;
      }
    }

    // Group by Day
    if (!dayMap.has(r.operationDate)) {
      dayMap.set(r.operationDate, {
        dateKey: r.operationDate,
        dateLabel: formatThaiDate(r.operationDate, true),
        fiscalYear: r.fiscalYear,
        quarter: r.quarter,
        totalPatients: 0,
        totalSessions: 0,
        labPatients: 0,
        labSessions: 0,
        drugPatients: 0,
        drugSessions: 0,
        units: new Set(),
        entitlements: createEmptyEntitlements(),
      });
    }
    const dRow = dayMap.get(r.operationDate);
    dRow.totalPatients += r.total;
    dRow.totalSessions += 1;
    dRow.units.add(r.unitName);
    addEntitlements(dRow.entitlements, r.entitlements);
    if (r.datasetType === 'lab') {
      dRow.labPatients += r.total;
      dRow.labSessions += 1;
    } else {
      dRow.drugPatients += r.total;
      dRow.drugSessions += 1;
    }

    // Group by Month
    if (!monthMap.has(r.monthKey)) {
      monthMap.set(r.monthKey, {
        monthKey: r.monthKey,
        yearCe: r.yearCe,
        month: r.month,
        fiscalYear: r.fiscalYear,
        quarter: r.quarter,
        label: formatThaiMonthYear(r.yearCe, r.month, true),
        fullLabel: formatThaiMonthYear(r.yearCe, r.month, false),
        totalPatients: 0,
        totalSessions: 0,
        labPatients: 0,
        labSessions: 0,
        drugPatients: 0,
        drugSessions: 0,
        units: new Set(),
        entitlements: createEmptyEntitlements(),
      });
    }
    const mRow = monthMap.get(r.monthKey);
    mRow.totalPatients += r.total;
    mRow.totalSessions += 1;
    mRow.units.add(r.unitName);
    addEntitlements(mRow.entitlements, r.entitlements);
    if (r.datasetType === 'lab') {
      mRow.labPatients += r.total;
      mRow.labSessions += 1;
    } else {
      mRow.drugPatients += r.total;
      mRow.drugSessions += 1;
    }

    // Group by Quarter (FY + Q)
    const qKey = `${r.fiscalYear}-Q${r.quarter}`;
    if (!quarterMap.has(qKey)) {
      const qNames = {
        1: 'ไตรมาส 1 (ต.ค.–ธ.ค.)',
        2: 'ไตรมาส 2 (ม.ค.–มี.ค.)',
        3: 'ไตรมาส 3 (เม.ย.–มิ.ย.)',
        4: 'ไตรมาส 4 (ก.ค.–ก.ย.)',
      };
      quarterMap.set(qKey, {
        quarterKey: qKey,
        fiscalYear: r.fiscalYear,
        quarter: r.quarter,
        label: `ปีงบ ${r.fiscalYear} ${qNames[r.quarter]}`,
        shortLabel: `Q${r.quarter}/${r.fiscalYear}`,
        totalPatients: 0,
        totalSessions: 0,
        labPatients: 0,
        labSessions: 0,
        drugPatients: 0,
        drugSessions: 0,
        units: new Set(),
        entitlements: createEmptyEntitlements(),
      });
    }
    const qRow = quarterMap.get(qKey);
    qRow.totalPatients += r.total;
    qRow.totalSessions += 1;
    qRow.units.add(r.unitName);
    addEntitlements(qRow.entitlements, r.entitlements);
    if (r.datasetType === 'lab') {
      qRow.labPatients += r.total;
      qRow.labSessions += 1;
    } else {
      qRow.drugPatients += r.total;
      qRow.drugSessions += 1;
    }

    // Group by Fiscal Year
    if (!fiscalYearMap.has(r.fiscalYear)) {
      fiscalYearMap.set(r.fiscalYear, {
        fiscalYear: r.fiscalYear,
        label: `ปีงบประมาณ ${r.fiscalYear}`,
        totalPatients: 0,
        totalSessions: 0,
        labPatients: 0,
        labSessions: 0,
        drugPatients: 0,
        drugSessions: 0,
        units: new Set(),
        entitlements: createEmptyEntitlements(),
      });
    }
    const fyRow = fiscalYearMap.get(r.fiscalYear);
    fyRow.totalPatients += r.total;
    fyRow.totalSessions += 1;
    fyRow.units.add(r.unitName);
    addEntitlements(fyRow.entitlements, r.entitlements);
    if (r.datasetType === 'lab') {
      fyRow.labPatients += r.total;
      fyRow.labSessions += 1;
    } else {
      fyRow.drugPatients += r.total;
      fyRow.drugSessions += 1;
    }

    // Weekday
    if (r.dayOfWeek !== null && weekdayMap.has(r.dayOfWeek)) {
      const wd = weekdayMap.get(r.dayOfWeek);
      wd.sessions += 1;
      wd.patients += r.total;
      if (r.datasetType === 'lab') wd.labPatients += r.total;
      else wd.drugPatients += r.total;
    }
  }

  summary.activeUnitsCount = unitMap.size;
  summary.avgPatientsPerSession =
    summary.totalSessions > 0
      ? Number((summary.totalPatients / summary.totalSessions).toFixed(1))
      : 0;
  summary.dateRangeStart = minDate ? formatThaiDate(minDate, true) : '-';
  summary.dateRangeEnd = maxDate ? formatThaiDate(maxDate, true) : '-';

  const byUnit = Array.from(unitMap.values())
    .map((u) => ({
      ...u,
      serviceModesList: Array.from(u.serviceModes),
      avgPatientsPerSession:
        u.totalSessions > 0 ? Number((u.totalPatients / u.totalSessions).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.totalPatients - a.totalPatients);

  const byDay = Array.from(dayMap.values())
    .map((d) => ({ ...d, unitCount: d.units.size }))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  const byMonth = Array.from(monthMap.values())
    .map((m) => ({ ...m, unitCount: m.units.size }))
    .sort((a, b) => {
      if (a.fiscalYear !== b.fiscalYear) return a.fiscalYear - b.fiscalYear;
      return FISCAL_MONTH_ORDER.indexOf(a.month) - FISCAL_MONTH_ORDER.indexOf(b.month);
    });

  const byQuarter = Array.from(quarterMap.values())
    .map((q) => ({ ...q, unitCount: q.units.size }))
    .sort((a, b) =>
      a.fiscalYear !== b.fiscalYear ? a.fiscalYear - b.fiscalYear : a.quarter - b.quarter
    );

  const byFiscalYear = Array.from(fiscalYearMap.values())
    .map((fy) => ({ ...fy, unitCount: fy.units.size }))
    .sort((a, b) => b.fiscalYear - a.fiscalYear);

  const byDayOfWeek = Array.from(weekdayMap.values());

  const entitlementSummary = ENTITLEMENT_FIELDS.map((f) => {
    const count = entitlementTotalsAll[f.key] || 0;
    const labCount = entitlementTotalsLab[f.key] || 0;
    const drugCount = entitlementTotalsDrug[f.key] || 0;
    const pct =
      summary.totalPatients > 0
        ? Number(((count / summary.totalPatients) * 100).toFixed(1))
        : 0;
    return {
      ...f,
      count,
      labCount,
      drugCount,
      pct,
    };
  }).sort((a, b) => b.count - a.count);

  const labModes = Array.from(labModeMap.values())
    .map((m) => ({
      ...m,
      avgPerSession: m.sessions > 0 ? Number((m.patients / m.sessions).toFixed(1)) : 0,
      pct: summary.labPatients > 0 ? Number(((m.patients / summary.labPatients) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.patients - a.patients);

  const drugModes = Array.from(drugModeMap.values())
    .map((m) => ({
      ...m,
      avgPerSession: m.sessions > 0 ? Number((m.patients / m.sessions).toFixed(1)) : 0,
      pct: summary.drugPatients > 0 ? Number(((m.patients / summary.drugPatients) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.patients - a.patients);

  const insights = buildActionableInsights({
    summary,
    byUnit,
    byDayOfWeek,
    entitlementSummary,
    labModes,
    drugModes,
    filtered,
  });

  return {
    filtered,
    summary,
    byUnit,
    byDay,
    byMonth,
    byQuarter,
    byFiscalYear,
    byDayOfWeek,
    entitlementSummary,
    labModes,
    drugModes,
    insights,
  };
}

function buildActionableInsights({
  summary,
  byUnit,
  byDayOfWeek,
  entitlementSummary,
  labModes,
  drugModes,
  filtered,
}) {
  if (!filtered.length) {
    return {
      executiveParagraph: 'ยังไม่มีข้อมูลในช่วงตัวกรองที่เลือก กรุณาเปลี่ยนตัวกรองหรือกดดึงข้อมูลล่าสุด',
      recommendations: [],
      qualityAlerts: [],
    };
  }

  const topUnit = byUnit[0];
  const topEntitlement = entitlementSummary[0];
  const activeWeekdays = [...byDayOfWeek].filter((d) => d.patients > 0).sort((a, b) => b.patients - a.patients);
  const peakDay = activeWeekdays[0];

  const executiveParagraph =
    `ภาพรวมการสนับสนุนเครือข่าย รพ.สต. ช่วง ${summary.dateRangeStart} ถึง ${summary.dateRangeEnd} ` +
    `ให้บริการครอบคลุม ${summary.activeUnitsCount} หน่วยบริการ รวม ${summary.totalSessions.toLocaleString()} ครั้ง ` +
    `ผู้รับบริการทั้งหมด ${summary.totalPatients.toLocaleString()} ราย ` +
    `(ส่งตรวจ Lab ${summary.labPatients.toLocaleString()} ราย / เบิกยา ${summary.drugPatients.toLocaleString()} ราย) ` +
    `โดยหน่วยบริการที่มีปริมาณผู้รับบริการสูงสุดคือ "${topUnit?.unitName || '-'}" ` +
    `(${topUnit?.totalPatients?.toLocaleString() || 0} ราย) ` +
    `และกลุ่มสิทธิหลักคือ ${topEntitlement?.label || '-'} (${topEntitlement?.pct || 0}%)`;

  const recommendations = [];

  // 1. วิเคราะห์ภาระ Yearly Lab
  const yearlyMode = labModes.find((m) => m.mode.toLowerCase().includes('yearly'));
  const highYearlyUnits = byUnit.filter((u) => u.yearlyLabPatients >= 80).slice(0, 3);
  if (yearlyMode && yearlyMode.patients > 0) {
    recommendations.push({
      id: 'yearly-lab-load',
      priority: 'high',
      category: 'การบริหารจัดการสิ่งส่งตรวจ (Lab)',
      icon: 'bi-eyedropper',
      finding: `งานตรวจประจำปี (Yearly Lab) คิดเป็น ${yearlyMode.pct}% ของยอดผู้รับบริการ Lab (${yearlyMode.patients.toLocaleString()} ราย, เฉลี่ย ${yearlyMode.avgPerSession} ราย/ครั้ง) โดยมีหน่วยบริการปริมาณสูง ได้แก่ ${highYearlyUnits.map((u) => u.unitName).join(', ') || topUnit?.unitName}`,
      action: 'จัดทำตารางนัดหมายรอบส่งสิ่งส่งตรวจ Yearly Lab ล่วงหน้าเป็นรายสัปดาห์ แยกช่องทางรับ-ลงทะเบียนออกจาก F/U Lab ปกติ และเตรียมหลอดเก็บสิ่งส่งตรวจ/ทีมรองรับล่วงหน้าในหน่วยบริการที่มีผู้รับบริการเกิน 50 ราย/ครั้ง',
    });
  }

  // 2. วิเคราะห์การส่งยาทางไปรษณีย์ (019)
  const postalMode = drugModes.find((m) => m.mode.includes('019') || m.mode.includes('ไปรษณีย์'));
  const frequentPostalUnits = byUnit.filter((u) => u.postalDrugSessions >= 2);
  if (postalMode && postalMode.sessions > 0) {
    recommendations.push({
      id: 'drug-postal-optimization',
      priority: 'medium',
      category: 'การจัดการคลังและจัดส่งยา (019)',
      icon: 'bi-box-seam',
      finding: `มีการส่งยาทางไปรษณีย์ (019) ${postalMode.sessions} ครั้ง (${postalMode.patients.toLocaleString()} ราย หรือ ${postalMode.pct}% ของผู้รับบริการเบิกยา) โดยมี ${frequentPostalUnits.length} หน่วยบริการที่มีการเบิกส่งทางไปรษณีย์ซ้ำหลายรอบ`,
      action: 'ทบทวนรายการยาที่ รพ.สต. เบิกส่งทางไปรษณีย์ซ้ำบ่อย เพื่อพิจารณาเพิ่มเป็นรายการยาสำรองประจำ รพ.สต. หรือกำหนดรอบรวมส่งรายสัปดาห์เพื่อลดค่าใช้จ่ายและความล่าช้าในการจัดส่ง',
    });
  }

  // 3. วิเคราะห์วันกระจุกตัวของภาระงาน (Peak Day)
  if (peakDay && activeWeekdays.length > 1) {
    const avgWeekdayPatients =
      activeWeekdays.reduce((s, d) => s + d.patients, 0) / activeWeekdays.length;
    if (peakDay.patients > avgWeekdayPatients * 1.25) {
      recommendations.push({
        id: 'weekday-peak',
        priority: 'medium',
        category: 'การกระจายภาระงานรายสัปดาห์',
        icon: 'bi-calendar2-week',
        finding: `วัน${peakDay.label} มีภาระงานสูงสุด (${peakDay.patients.toLocaleString()} ราย จาก ${peakDay.sessions} ครั้ง) สูงกว่าค่าเฉลี่ยวันทำการอื่นอย่างชัดเจน`,
        action: `ประสานเครือข่าย รพ.สต. กระจายรอบการส่ง Yearly Lab หรือส่งคำขอเบิกยาในวัน${activeWeekdays[activeWeekdays.length - 1]?.label || 'ที่ภาระงานน้อย'} เพื่อลดความแออัดของห้องปฏิบัติการและห้องจ่ายยา`,
      });
    }
  }

  // 4. วิเคราะห์กลุ่มสิทธิเปราะบาง (ผู้มีปัญหาสถานะทางสิทธิ์ + อนุเคราะห์)
  if (summary.vulnerablePatients > 0) {
    recommendations.push({
      id: 'vulnerable-entitlement',
      priority: 'medium',
      category: 'การประสานสิทธิและงบประมาณ',
      icon: 'bi-shield-check',
      finding: `พบผู้รับบริการกลุ่มผู้มีปัญหาสถานะทางสิทธิ์และอนุเคราะห์รวม ${summary.vulnerablePatients.toLocaleString()} ราย`,
      action: 'รวบรวมรายชื่อส่งต่อทีมศูนย์จัดเก็บรายได้/งานประกันสุขภาพ เพื่อตรวจสอบการขึ้นทะเบียนสิทธิและการเบิกชดเชยค่ารักษาให้ครบถ้วนก่อนปิดรอบไตรมาส',
    });
  }

  // 5. วิเคราะห์ความทันเวลาการบันทึกข้อมูล
  if (summary.delayedCount > 0) {
    recommendations.push({
      id: 'recording-timeliness',
      priority: 'low',
      category: 'คุณภาพและความทันเวลาของข้อมูล',
      icon: 'bi-clock-history',
      finding: `พบ ${summary.delayedCount} รายการที่วันประทับเวลาบันทึกช้ากว่าวันที่ดำเนินการมากกว่า 1 วัน`,
      action: 'กำชับผู้ปฏิบัติงานบันทึกข้อมูลส่งสิ่งส่งตรวจและเบิกยาภายในวันเดียวกันหลังเสร็จสิ้นภารกิจ เพื่อให้ตัวเลขติดตามบนหน้าจอเป็นปัจจุบันเสมอ',
    });
  }

  const qualityAlerts = [];
  if (summary.mismatchCount > 0) {
    qualityAlerts.push(
      `พบ ${summary.mismatchCount} แถวที่ผลรวม 8 สิทธิไม่ตรงกับคอลัมน์ "รวม" ในชีทต้นทาง`
    );
  }
  if (summary.delayedCount > 0) {
    qualityAlerts.push(
      `พบ ${summary.delayedCount} แถวที่บันทึกย้อนหลังเกิน 1 วันจากวันที่ดำเนินการ`
    );
  }

  return {
    executiveParagraph,
    recommendations,
    qualityAlerts,
  };
}

export function getFiscalMonthName(monthNum) {
  return getThaiMonthLabel(monthNum, false);
}
