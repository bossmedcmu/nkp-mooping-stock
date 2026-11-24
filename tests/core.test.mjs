import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getBangkokDayOfWeek,
  getThaiFiscalQuarter,
  getThaiFiscalYear,
  parseDateString,
} from '../src/utils/thaiTime.js';
import { normalizeAllData } from '../src/utils/dataNormalizer.js';
import {
  computeAnalytics,
  extractFiscalYears,
  extractServiceModes,
  filterRecords,
} from '../src/utils/analyticsEngine.js';
import {
  buildRawRecordsCsv,
  buildUnitSummaryCsv,
  escapeCsvCell,
} from '../src/utils/csvExporter.js';
import {
  answerMascotQuestion,
  computeMascotLayout,
  DEFAULT_NUNG_MEAW_PREFS,
  loadNungMeawPrefs,
} from '../src/utils/nungMeawBrain.js';
import { parseCsvToRowObjects, SAMPLE_DRUG_CSV, SAMPLE_LAB_CSV } from './fixtures.mjs';

test('Thai Fiscal Year & Quarter boundaries (1 Oct - 30 Sep)', () => {
  assert.equal(getThaiFiscalYear('2026-09-30'), 2569);
  assert.equal(getThaiFiscalQuarter('2026-09-30'), 4);

  assert.equal(getThaiFiscalYear('2026-10-01'), 2570);
  assert.equal(getThaiFiscalQuarter('2026-10-01'), 1);

  assert.equal(getThaiFiscalYear('2027-01-15'), 2570);
  assert.equal(getThaiFiscalQuarter('2027-01-15'), 2);

  assert.equal(getThaiFiscalQuarter('2027-05-01'), 3);

  const parsed = parseDateString('2026-11-24');
  assert.deepEqual(parsed, { year: 2026, month: 11, day: 24 });

  // 2026-11-24 at 09:00 Bangkok time is Tuesday (2)
  const dow = getBangkokDayOfWeek(new Date('2026-11-24T09:00:00+07:00'));
  assert.equal(dow, 2);
});

test('Data Normalizer handles whitespace headers and swapped entitlement order between Lab & Drug', () => {
  const labRaw = parseCsvToRowObjects(SAMPLE_LAB_CSV);
  const drugRaw = parseCsvToRowObjects(SAMPLE_DRUG_CSV);
  const { labRecords, drugRecords, allRecords } = normalizeAllData(labRaw, drugRaw);

  assert.equal(labRecords.length, 42);
  assert.equal(drugRecords.length, 45);
  assert.equal(allRecords.length, 87);

  // Verify no row has mismatch in the provided real sample data
  const mismatches = allRecords.filter((r) => r.hasMismatch);
  assert.equal(mismatches.length, 0);

  // Verify Drug swapped column order (2026-10-20 ทัณฑสถานหญิงเชียงใหม่: ชำระเงินเอง=1, ข้าราชการ=1, อนุเคราะห์=1, รวม=18)
  const prisonDrug = drugRecords.find(
    (r) => r.unitName === 'ทัณฑสถานหญิงเชียงใหม่' && r.operationDate === '2026-10-20'
  );
  assert.ok(prisonDrug);
  assert.equal(prisonDrug.entitlements.ucNkp, 15);
  assert.equal(prisonDrug.entitlements.selfPay, 1);
  assert.equal(prisonDrug.entitlements.civilServant, 1);
  assert.equal(prisonDrug.entitlements.welfare, 1);
  assert.equal(prisonDrug.entitlements.sso, 0);
  assert.equal(prisonDrug.total, 18);
});

test('Analytics Engine computes totals, groupings, and actionable insights accurately', () => {
  const labRaw = parseCsvToRowObjects(SAMPLE_LAB_CSV);
  const drugRaw = parseCsvToRowObjects(SAMPLE_DRUG_CSV);
  const { allRecords } = normalizeAllData(labRaw, drugRaw);

  const fys = extractFiscalYears(allRecords);
  assert.deepEqual(fys, [2570]);

  const result = computeAnalytics(allRecords, { fiscalYear: '2570', datasetMode: 'ALL' });
  assert.equal(result.summary.totalSessions, 87);
  assert.equal(result.summary.labSessions, 42);
  assert.equal(result.summary.drugSessions, 45);
  assert.ok(result.summary.totalPatients > 1000);
  assert.ok(result.byUnit.length >= 15);
  assert.equal(result.byMonth.length, 2); // ต.ค. 2569 and พ.ย. 2569
  assert.equal(result.byQuarter.length, 1); // Q1/2570
  assert.ok(result.insights.recommendations.length >= 3);
});

test('Extended filterRecords supports dateStart, dateEnd, serviceMode, and entitlementKey', () => {
  const labRaw = parseCsvToRowObjects(SAMPLE_LAB_CSV);
  const drugRaw = parseCsvToRowObjects(SAMPLE_DRUG_CSV);
  const { allRecords } = normalizeAllData(labRaw, drugRaw);

  const modes = extractServiceModes(allRecords);
  assert.ok(modes.includes('Yearly Lab'));
  assert.ok(modes.includes('F/U Lab'));

  const dateFiltered = filterRecords(allRecords, {
    dateStart: '2026-11-01',
    dateEnd: '2026-11-15',
  });
  assert.ok(dateFiltered.length > 0);
  assert.ok(dateFiltered.every((r) => r.operationDate >= '2026-11-01' && r.operationDate <= '2026-11-15'));

  const yearlyOnly = filterRecords(allRecords, { serviceMode: 'Yearly Lab' });
  assert.ok(yearlyOnly.length > 0);
  assert.ok(yearlyOnly.every((r) => r.serviceMode === 'Yearly Lab'));

  const welfareOnly = filterRecords(allRecords, { entitlementKey: 'welfare' });
  assert.ok(welfareOnly.length > 0);
  assert.ok(welfareOnly.every((r) => r.entitlements.welfare > 0));
});

test('Deep Analytics computes MoM growth, Pareto 80/20, Unit Tiers, Heatmaps, and Data Quality', () => {
  const labRaw = parseCsvToRowObjects(SAMPLE_LAB_CSV);
  const drugRaw = parseCsvToRowObjects(SAMPLE_DRUG_CSV);
  const { allRecords } = normalizeAllData(labRaw, drugRaw);

  const result = computeAnalytics(allRecords, { fiscalYear: '2570', datasetMode: 'ALL' });
  const deep = result.deepAnalytics;

  assert.ok(deep.growthMetrics.momTotalPct !== null);
  assert.equal(deep.growthMetrics.prevMonthLabel, 'ต.ค. 2569');
  assert.equal(deep.growthMetrics.latestMonthLabel, 'พ.ย. 2569');

  assert.ok(deep.paretoUnits.length === result.byUnit.length);
  assert.ok(deep.paretoSummary.coreUnitCount >= 1);
  assert.ok(deep.paretoSummary.coreSharePct >= 80);
  assert.equal(deep.paretoUnits[deep.paretoUnits.length - 1].cumulativePct, 100);

  const totalTiered =
    deep.unitTiers.tierCounts.A + deep.unitTiers.tierCounts.B + deep.unitTiers.tierCounts.C;
  assert.equal(totalTiered, result.byUnit.length);
  assert.equal(deep.unitTiers.scatterPoints.length, result.byUnit.length);

  assert.equal(deep.weekdayModeMatrix.rows.length, 7);
  assert.ok(deep.weekdayModeMatrix.modes.length >= 3);
  assert.equal(deep.unitMonthMatrix.months.length, 2);
  assert.ok(deep.unitMonthMatrix.rows.length <= 12);

  assert.ok(deep.dataQuality.onTimeWithin1DayPct > 90);
  assert.equal(deep.dataQuality.mismatchRecords.length, 0);
  assert.ok(deep.dataQuality.lagByUnit.length === result.byUnit.length);
});

test('CSV Exporter adds UTF-8 BOM and neutralizes formula injection characters', () => {
  assert.equal(escapeCsvCell('=CMD()'), "'=CMD()");
  assert.equal(escapeCsvCell('+1+1'), "'+1+1");
  assert.equal(escapeCsvCell('-123'), "'-123");
  assert.equal(escapeCsvCell('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(escapeCsvCell('รพ.สต.บ้านใหม่, เชียงใหม่'), '"รพ.สต.บ้านใหม่, เชียงใหม่"');

  const labRaw = parseCsvToRowObjects(SAMPLE_LAB_CSV);
  const drugRaw = parseCsvToRowObjects(SAMPLE_DRUG_CSV);
  const { allRecords } = normalizeAllData(labRaw, drugRaw);
  const result = computeAnalytics(allRecords, { fiscalYear: '2570', datasetMode: 'ALL' });

  const unitCsv = buildUnitSummaryCsv(result.byUnit);
  assert.ok(unitCsv.startsWith('\uFEFFลำดับ,รายชื่อ รพ.สต.'));

  const rawCsv = buildRawRecordsCsv(result.filtered);
  assert.ok(rawCsv.startsWith('\uFEFFวันที่ดำเนินการ,วันประทับเวลา'));
});

test('NungMeaw Q&A engine answers top unit, Lab vs Drug, entitlements, peak periods, and issues', () => {
  const labRaw = parseCsvToRowObjects(SAMPLE_LAB_CSV);
  const drugRaw = parseCsvToRowObjects(SAMPLE_DRUG_CSV);
  const { allRecords } = normalizeAllData(labRaw, drugRaw);
  const analytics = computeAnalytics(allRecords, { fiscalYear: '2570', datasetMode: 'ALL' });

  const topAns = answerMascotQuestion('รพ.สต.ไหนเยอะสุด', analytics);
  assert.ok(topAns.text.includes(analytics.byUnit[0].unitName));
  assert.equal(topAns.action?.type, 'unit');

  const compareAns = answerMascotQuestion('เทียบ Lab กับ ยา', analytics);
  assert.ok(compareAns.text.includes('Lab'));
  assert.ok(compareAns.text.includes('เบิกยา'));

  const peakAns = answerMascotQuestion('เดือนไหนพีคสุด', analytics);
  assert.ok(peakAns.text.includes('พ.ย. 2569') || peakAns.text.includes('ต.ค. 2569'));
  assert.ok(!peakAns.text.includes('undefined'));

  const issueAns = answerMascotQuestion('จุดผิดปกติและล่าช้า', analytics);
  assert.ok(issueAns.text.includes('กฎ 80/20'));
  assert.ok(!issueAns.text.includes('undefined'));

  // Safe fallback when localStorage is absent in Node
  const prefs = loadNungMeawPrefs();
  assert.equal(prefs.outfitId, DEFAULT_NUNG_MEAW_PREFS.outfitId);

  // Viewport clamping guarantees both cat and panel stay inside screen at all corners & mobile
  const scenarios = [
    { pos: null, vp: { w: 1280, h: 800 } },
    { pos: { x: -100, y: -100 }, vp: { w: 1280, h: 800 } },
    { pos: { x: 2000, y: 2000 }, vp: { w: 1280, h: 800 } },
    { pos: { x: 250, y: 15 }, vp: { w: 360, h: 640 } },
    { pos: { x: 20, y: 300 }, vp: { w: 360, h: 520 } },
  ];
  for (const s of scenarios) {
    const layout = computeMascotLayout(s.pos, s.vp);
    assert.ok(layout.catPos.x >= 16);
    assert.ok(layout.catPos.y >= 16);
    assert.ok(layout.catPos.x + layout.safeBox.w <= s.vp.w - 16);
    assert.ok(layout.catPos.y + layout.safeBox.h <= s.vp.h - 16);

    const pLeft = parseInt(layout.panelStyle.left, 10);
    const pWidth = parseInt(layout.panelStyle.width, 10);
    assert.ok(pLeft >= 12);
    assert.ok(pLeft + pWidth <= s.vp.w - 12);

    const bLeft = parseInt(layout.bubbleStyle.left, 10);
    const bMaxW = parseInt(layout.bubbleStyle.maxWidth, 10);
    assert.ok(bLeft >= 12);
    assert.ok(bLeft + bMaxW <= s.vp.w - 12);
  }
});
