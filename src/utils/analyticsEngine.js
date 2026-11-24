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

export function extractServiceModes(records) {
  const modes = new Set();
  for (const r of records) {
    if (r.serviceMode) modes.add(r.serviceMode);
  }
  return Array.from(modes).sort((a, b) => a.localeCompare(b, 'th'));
}

export function filterRecords(records, filters = {}) {
  const {
    fiscalYear = 'ALL',
    datasetMode = 'ALL', // 'ALL' | 'lab' | 'drug'
    unitName = 'ALL',
    quarter = 'ALL',
    month = 'ALL',
    dateStart = '',
    dateEnd = '',
    serviceMode = 'ALL',
    entitlementKey = 'ALL',
    search = '',
  } = filters;

  const q = String(search || '').trim().toLowerCase();

  return records.filter((r) => {
    if (fiscalYear !== 'ALL' && Number(r.fiscalYear) !== Number(fiscalYear)) return false;
    if (datasetMode !== 'ALL' && r.datasetType !== datasetMode) return false;
    if (unitName !== 'ALL' && r.unitName !== unitName) return false;
    if (quarter !== 'ALL' && Number(r.quarter) !== Number(quarter)) return false;
    if (month !== 'ALL' && Number(r.month) !== Number(month)) return false;
    if (dateStart && r.operationDate < dateStart) return false;
    if (dateEnd && r.operationDate > dateEnd) return false;
    if (serviceMode !== 'ALL' && r.serviceMode !== serviceMode) return false;
    if (entitlementKey !== 'ALL' && (r.entitlements?.[entitlementKey] || 0) <= 0) return false;
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

  const deepAnalytics = buildDeepAnalytics({
    filtered,
    summary,
    byUnit,
    byMonth,
    byQuarter,
    byDayOfWeek,
    entitlementSummary,
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
    deepAnalytics,
  };
}

function calcGrowthPct(current, previous) {
  if (!previous || previous <= 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function buildDeepAnalytics({
  filtered,
  summary,
  byUnit,
  byMonth,
  byQuarter,
  byDayOfWeek,
  entitlementSummary,
}) {
  // 1. Growth Metrics (MoM & QoQ)
  const latestMonth = byMonth.length >= 1 ? byMonth[byMonth.length - 1] : null;
  const prevMonth = byMonth.length >= 2 ? byMonth[byMonth.length - 2] : null;
  const latestQuarter = byQuarter.length >= 1 ? byQuarter[byQuarter.length - 1] : null;
  const prevQuarter = byQuarter.length >= 2 ? byQuarter[byQuarter.length - 2] : null;

  const growthMetrics = {
    momTotalPct: prevMonth ? calcGrowthPct(latestMonth.totalPatients, prevMonth.totalPatients) : null,
    momLabPct: prevMonth ? calcGrowthPct(latestMonth.labPatients, prevMonth.labPatients) : null,
    momDrugPct: prevMonth ? calcGrowthPct(latestMonth.drugPatients, prevMonth.drugPatients) : null,
    latestMonthLabel: latestMonth?.label || '',
    prevMonthLabel: prevMonth?.label || '',
    qoqTotalPct: prevQuarter ? calcGrowthPct(latestQuarter.totalPatients, prevQuarter.totalPatients) : null,
    qoqLabPct: prevQuarter ? calcGrowthPct(latestQuarter.labPatients, prevQuarter.labPatients) : null,
    qoqDrugPct: prevQuarter ? calcGrowthPct(latestQuarter.drugPatients, prevQuarter.drugPatients) : null,
    latestQuarterLabel: latestQuarter?.shortLabel || '',
    prevQuarterLabel: prevQuarter?.shortLabel || '',
  };

  // 2. Pareto 80/20
  let runningPatients = 0;
  let coreUnitCount = 0;
  let coreSharePct = 0;
  const paretoUnits = byUnit.map((u) => {
    const prevCumPct = summary.totalPatients > 0 ? (runningPatients / summary.totalPatients) * 100 : 0;
    runningPatients += u.totalPatients;
    const sharePct =
      summary.totalPatients > 0
        ? Number(((u.totalPatients / summary.totalPatients) * 100).toFixed(1))
        : 0;
    const cumulativePct =
      summary.totalPatients > 0
        ? Number(((runningPatients / summary.totalPatients) * 100).toFixed(1))
        : 0;
    const isCore80 = summary.totalPatients > 0 && prevCumPct < 80;
    if (isCore80) {
      coreUnitCount += 1;
      coreSharePct = cumulativePct;
    }
    return {
      unitName: u.unitName,
      totalPatients: u.totalPatients,
      labPatients: u.labPatients,
      drugPatients: u.drugPatients,
      sharePct,
      cumulativePct,
      isCore80,
    };
  });

  const paretoSummary = {
    coreUnitCount,
    totalUnitCount: byUnit.length,
    coreSharePct,
  };

  // 3. Unit Tiers (A / B / C) & Scatter points (Sessions vs Avg Patients/Session)
  const nUnits = byUnit.length;
  const tierACutoff = nUnits > 0 ? Math.max(1, Math.ceil(nUnits * 0.2)) : 0;
  const tierBCutoff = nUnits > 1 ? Math.max(tierACutoff + 1, Math.ceil(nUnits * 0.5)) : tierACutoff;

  const tierCounts = { A: 0, B: 0, C: 0 };
  const tierLabels = {
    A: 'Tier A (ภาระงานสูง)',
    B: 'Tier B (ภาระงานปานกลาง)',
    C: 'Tier C (ภาระงานน้อย)',
  };

  const tieredUnits = byUnit.map((u, idx) => {
    let tier = 'C';
    if (idx < tierACutoff) tier = 'A';
    else if (idx < tierBCutoff) tier = 'B';
    tierCounts[tier] += 1;
    return {
      unitName: u.unitName,
      totalPatients: u.totalPatients,
      totalSessions: u.totalSessions,
      avgPatientsPerSession: u.avgPatientsPerSession,
      labPatients: u.labPatients,
      drugPatients: u.drugPatients,
      tier,
      tierLabel: tierLabels[tier],
    };
  });

  const unitTiers = {
    units: tieredUnits,
    tierCounts,
    scatterPoints: tieredUnits.map((u) => ({
      unitName: u.unitName,
      x: u.totalSessions,
      y: u.avgPatientsPerSession,
      totalPatients: u.totalPatients,
      tier: u.tier,
    })),
  };

  // 4. Entitlement Comparison (Lab vs Drug)
  const entItems = entitlementSummary.map((e) => ({
    ...e,
    labPct: summary.labPatients > 0 ? Number(((e.labCount / summary.labPatients) * 100).toFixed(1)) : 0,
    drugPct: summary.drugPatients > 0 ? Number(((e.drugCount / summary.drugPatients) * 100).toFixed(1)) : 0,
  }));
  const findEnt = (k) => entitlementSummary.find((e) => e.key === k)?.count || 0;
  const ucNkp = findEnt('ucNkp');
  const ucMaesa = findEnt('ucMaesa');
  const ucKhajao = findEnt('ucKhajao');
  const ucTotal = ucNkp + ucMaesa + ucKhajao;
  const entitlementComparison = {
    items: entItems,
    ucBreakdown: {
      ucNkp,
      ucMaesa,
      ucKhajao,
      ucTotal,
      ucSharePct:
        summary.totalPatients > 0 ? Number(((ucTotal / summary.totalPatients) * 100).toFixed(1)) : 0,
    },
  };

  // 5. Heatmap: Weekday x Service Mode
  const modeTotalsMap = new Map();
  for (const r of filtered) {
    modeTotalsMap.set(r.serviceMode, (modeTotalsMap.get(r.serviceMode) || 0) + r.total);
  }
  const modes = Array.from(modeTotalsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([m]) => m);

  const weekdayModeBuckets = new Map();
  for (const wd of byDayOfWeek) {
    const cells = {};
    for (const m of modes) {
      cells[m] = { patients: 0, sessions: 0 };
    }
    weekdayModeBuckets.set(wd.dayIndex, {
      dayIndex: wd.dayIndex,
      label: wd.label,
      totalPatients: wd.patients,
      cells,
    });
  }

  let maxWeekdayCellPatients = 0;
  for (const r of filtered) {
    const bucket = weekdayModeBuckets.get(r.dayOfWeek);
    if (bucket && bucket.cells[r.serviceMode]) {
      bucket.cells[r.serviceMode].patients += r.total;
      bucket.cells[r.serviceMode].sessions += 1;
      if (bucket.cells[r.serviceMode].patients > maxWeekdayCellPatients) {
        maxWeekdayCellPatients = bucket.cells[r.serviceMode].patients;
      }
    }
  }

  const weekdayModeMatrix = {
    modes,
    rows: Array.from(weekdayModeBuckets.values()),
    maxCellPatients: maxWeekdayCellPatients,
  };

  // 6. Heatmap: Top 12 Units x Month
  const top12Units = byUnit.slice(0, 12);
  const months = byMonth.map((m) => ({ monthKey: m.monthKey, label: m.label }));
  const unitMonthBuckets = new Map();
  for (const u of top12Units) {
    const cells = {};
    for (const m of months) cells[m.monthKey] = 0;
    unitMonthBuckets.set(u.unitName, {
      unitName: u.unitName,
      totalPatients: u.totalPatients,
      cells,
    });
  }

  let maxUnitMonthPatients = 0;
  for (const r of filtered) {
    const uRow = unitMonthBuckets.get(r.unitName);
    if (uRow && Object.prototype.hasOwnProperty.call(uRow.cells, r.monthKey)) {
      uRow.cells[r.monthKey] += r.total;
      if (uRow.cells[r.monthKey] > maxUnitMonthPatients) {
        maxUnitMonthPatients = uRow.cells[r.monthKey];
      }
    }
  }

  const unitMonthMatrix = {
    months,
    rows: Array.from(unitMonthBuckets.values()),
    maxCellPatients: maxUnitMonthPatients,
  };

  // 7. Data Quality & Timeliness
  let onTimeSameDayCount = 0;
  let onTimeWithin1DayCount = 0;
  let totalLagDays = 0;
  let maxLagDays = 0;
  const lagUnitMap = new Map();
  const mismatchRecords = [];
  const delayedRecords = [];

  for (const r of filtered) {
    const effectiveLag = Math.max(0, r.lagDays || 0);
    if (effectiveLag === 0) onTimeSameDayCount += 1;
    if (effectiveLag <= 1) onTimeWithin1DayCount += 1;
    totalLagDays += effectiveLag;
    if (effectiveLag > maxLagDays) maxLagDays = effectiveLag;

    if (!lagUnitMap.has(r.unitName)) {
      lagUnitMap.set(r.unitName, {
        unitName: r.unitName,
        sessions: 0,
        totalLag: 0,
        maxLagDays: 0,
        delayedSessions: 0,
        within1DaySessions: 0,
      });
    }
    const lu = lagUnitMap.get(r.unitName);
    lu.sessions += 1;
    lu.totalLag += effectiveLag;
    if (effectiveLag > lu.maxLagDays) lu.maxLagDays = effectiveLag;
    if (effectiveLag > 1) {
      lu.delayedSessions += 1;
      delayedRecords.push(r);
    } else {
      lu.within1DaySessions += 1;
    }

    if (r.hasMismatch) {
      mismatchRecords.push({
        id: r.id,
        operationDate: r.operationDate,
        unitName: r.unitName,
        datasetLabel: r.datasetLabel,
        reportedTotal: r.reportedTotal,
        computedTotal: r.computedTotal,
        diff: r.reportedTotal - r.computedTotal,
      });
    }
  }

  const totalSessions = filtered.length;
  const lagByUnit = Array.from(lagUnitMap.values())
    .map((lu) => ({
      unitName: lu.unitName,
      sessions: lu.sessions,
      avgLagDays: lu.sessions > 0 ? Number((lu.totalLag / lu.sessions).toFixed(1)) : 0,
      maxLagDays: lu.maxLagDays,
      delayedSessions: lu.delayedSessions,
      onTimeWithin1DayPct:
        lu.sessions > 0 ? Number(((lu.within1DaySessions / lu.sessions) * 100).toFixed(1)) : 100,
    }))
    .sort((a, b) => b.avgLagDays - a.avgLagDays || b.delayedSessions - a.delayedSessions);

  const dataQuality = {
    onTimeSameDayCount,
    onTimeWithin1DayCount,
    onTimeSameDayPct:
      totalSessions > 0 ? Number(((onTimeSameDayCount / totalSessions) * 100).toFixed(1)) : 0,
    onTimeWithin1DayPct:
      totalSessions > 0 ? Number(((onTimeWithin1DayCount / totalSessions) * 100).toFixed(1)) : 0,
    avgLagDays: totalSessions > 0 ? Number((totalLagDays / totalSessions).toFixed(1)) : 0,
    maxLagDays,
    lagByUnit,
    mismatchRecords,
    delayedRecords: delayedRecords.sort((a, b) => b.lagDays - a.lagDays).slice(0, 30),
  };

  return {
    growthMetrics,
    paretoUnits,
    paretoSummary,
    unitTiers,
    entitlementComparison,
    weekdayModeMatrix,
    unitMonthMatrix,
    dataQuality,
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
