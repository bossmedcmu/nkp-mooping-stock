import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getBangkokDayOfWeek,
  getThaiFiscalQuarter,
  getThaiFiscalYear,
  parseDateString,
} from '../src/utils/thaiTime.js';
import { normalizeAllData } from '../src/utils/dataNormalizer.js';
import { computeAnalytics, extractFiscalYears } from '../src/utils/analyticsEngine.js';
import { parseCsvToRowObjects, SAMPLE_DRUG_CSV, SAMPLE_LAB_CSV } from '../src/data/sampleData.js';

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
