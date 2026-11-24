/**
 * บริการดึงข้อมูลจากแหล่งข้อมูลออนไลน์และแคชในเครื่อง
 */

import { parseCsvToRowObjects, SAMPLE_DRUG_CSV, SAMPLE_LAB_CSV } from '../data/sampleData.js';
import { normalizeAllData } from '../utils/dataNormalizer.js';
import { formatThaiDateTime, getBangkokNowIso } from '../utils/thaiTime.js';

const CACHE_KEY = 'nkp_pcu_cached_data_v1';

export function isLiveSyncConfigured() {
  const url = String(import.meta.env.VITE_APPS_SCRIPT_URL || '').trim();
  const key = String(import.meta.env.VITE_APPS_SCRIPT_API_KEY || '').trim();
  return Boolean(url && key);
}

export function loadInitialDataset() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.labRaw) && Array.isArray(parsed.drugRaw)) {
        const normalized = normalizeAllData(parsed.labRaw, parsed.drugRaw);
        return {
          ...normalized,
          sourceType: parsed.sourceType || 'sample',
          lastUpdatedIso: parsed.lastUpdatedIso || '',
          lastUpdatedLabel: parsed.lastUpdatedIso
            ? formatThaiDateTime(parsed.lastUpdatedIso)
            : 'ข้อมูลตัวอย่างเริ่มต้น',
          sourcesMeta: parsed.sourcesMeta || [],
        };
      }
    }
  } catch {
    // fallback to sample
  }

  const sampleLab = parseCsvToRowObjects(SAMPLE_LAB_CSV);
  const sampleDrug = parseCsvToRowObjects(SAMPLE_DRUG_CSV);
  const normalized = normalizeAllData(sampleLab, sampleDrug);
  return {
    ...normalized,
    sourceType: 'sample',
    lastUpdatedIso: '',
    lastUpdatedLabel: 'ข้อมูลตัวอย่างเริ่มต้น (กดดึงข้อมูลล่าสุดเพื่อซิงค์จริง)',
    sourcesMeta: [],
  };
}

export async function fetchAndStoreLiveDataset() {
  const url = String(import.meta.env.VITE_APPS_SCRIPT_URL || '').trim();
  const apiKey = String(import.meta.env.VITE_APPS_SCRIPT_API_KEY || '').trim();

  if (!url || !apiKey) {
    // หากยังไม่ได้ตั้งค่าการเชื่อมต่อออนไลน์ ให้แจ้งกลับอย่างชัดเจนและคงข้อมูลที่มีอยู่
    return {
      ok: false,
      notConfigured: true,
      message:
        'ระบบยังไม่ได้เชื่อมต่อแหล่งข้อมูลออนไลน์ (อยู่ระหว่างใช้ข้อมูลตัวอย่างเริ่มต้น หากตั้งค่าการเชื่อมต่อแล้วสามารถกดดึงข้อมูลได้ทันที)',
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({ apiKey }),
  });

  if (!response.ok) {
    throw new Error(`ไม่สามารถเชื่อมต่อแหล่งข้อมูลได้ (รหัสสถานะ ${response.status})`);
  }

  const payload = await response.json();
  if (!payload || !payload.ok) {
    throw new Error(payload?.error || 'การตรวจสอบสิทธิ์ดึงข้อมูลไม่สำเร็จ');
  }

  const labRaw = Array.isArray(payload.labRows) ? payload.labRows : [];
  const drugRaw = Array.isArray(payload.drugRows) ? payload.drugRows : [];
  const fetchedIso = payload.fetchedAt || getBangkokNowIso();

  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        sourceType: 'live',
        lastUpdatedIso: fetchedIso,
        sourcesMeta: payload.sources || [],
        labRaw,
        drugRaw,
      })
    );
  } catch {
    // ignore storage quota error
  }

  const normalized = normalizeAllData(labRaw, drugRaw);
  return {
    ok: true,
    dataset: {
      ...normalized,
      sourceType: 'live',
      lastUpdatedIso: fetchedIso,
      lastUpdatedLabel: formatThaiDateTime(fetchedIso),
      sourcesMeta: payload.sources || [],
    },
  };
}
