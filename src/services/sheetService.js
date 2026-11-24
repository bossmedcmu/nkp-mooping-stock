/**
 * บริการดึงข้อมูลจากแหล่งข้อมูลออนไลน์และพักข้อมูลชั่วคราวเฉพาะใน Session
 * ข้อมูลที่ดึงมามีอายุจำกัด 60 นาที และถูกล้างออกทันทีเมื่อหมดอายุ ออกจากระบบ หรือปิดแท็บ
 */

import { normalizeAllData } from '../utils/dataNormalizer.js';
import { formatThaiDateTime, getBangkokNowIso } from '../utils/thaiTime.js';

const SESSION_CACHE_KEY = 'nkp_pcu_session_data_v2';
const LEGACY_LOCAL_CACHE_KEY = 'nkp_pcu_cached_data_v1';
export const DATA_CACHE_TTL_MS = 60 * 60 * 1000; // 60 นาที

export function isLiveSyncConfigured() {
  const url = String(import.meta.env.VITE_APPS_SCRIPT_URL || '').trim();
  const key = String(import.meta.env.VITE_APPS_SCRIPT_API_KEY || '').trim();
  return Boolean(url && key);
}

export function createEmptyDataset() {
  return {
    labRecords: [],
    drugRecords: [],
    allRecords: [],
    sourceType: 'empty',
    lastUpdatedIso: '',
    lastUpdatedLabel: 'ยังไม่ได้ดึงข้อมูลล่าสุด',
    sourcesMeta: [],
    expiresAt: 0,
  };
}

export function getRemainingCacheMinutes(expiresAt) {
  if (!expiresAt || typeof expiresAt !== 'number') return 0;
  const diff = expiresAt - Date.now();
  return diff > 0 ? Math.ceil(diff / 60000) : 0;
}

export function clearCachedDataset() {
  try {
    sessionStorage.removeItem(SESSION_CACHE_KEY);
  } catch {
    // ignore storage errors
  }
  try {
    localStorage.removeItem(LEGACY_LOCAL_CACHE_KEY);
  } catch {
    // ignore storage errors
  }
}

export function loadInitialDataset() {
  // กวาดล้างแคชถาวรรุ่นเดิมใน localStorage เสมอเพื่อไม่ให้มีข้อมูลค้างบนเครื่อง
  try {
    localStorage.removeItem(LEGACY_LOCAL_CACHE_KEY);
  } catch {
    // ignore
  }

  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const isValidExpiry =
        parsed && typeof parsed.expiresAt === 'number' && Date.now() < parsed.expiresAt;
      if (
        isValidExpiry &&
        Array.isArray(parsed.labRaw) &&
        Array.isArray(parsed.drugRaw)
      ) {
        const normalized = normalizeAllData(parsed.labRaw, parsed.drugRaw);
        return {
          ...normalized,
          sourceType: 'live',
          lastUpdatedIso: parsed.lastUpdatedIso || '',
          lastUpdatedLabel: parsed.lastUpdatedIso
            ? formatThaiDateTime(parsed.lastUpdatedIso)
            : 'ดึงข้อมูลล่าสุดแล้ว',
          sourcesMeta: parsed.sourcesMeta || [],
          expiresAt: parsed.expiresAt,
        };
      }
      sessionStorage.removeItem(SESSION_CACHE_KEY);
    }
  } catch {
    try {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
    } catch {
      // ignore
    }
  }

  return createEmptyDataset();
}

export async function fetchAndStoreLiveDataset() {
  const url = String(import.meta.env.VITE_APPS_SCRIPT_URL || '').trim();
  const apiKey = String(import.meta.env.VITE_APPS_SCRIPT_API_KEY || '').trim();

  if (!url || !apiKey) {
    return {
      ok: false,
      notConfigured: true,
      message:
        'ระบบยังไม่ได้เชื่อมต่อแหล่งข้อมูลออนไลน์ กรุณาติดต่อผู้ดูแลระบบเพื่อตั้งค่าการเชื่อมต่อ',
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
  const expiresAt = Date.now() + DATA_CACHE_TTL_MS;

  try {
    sessionStorage.setItem(
      SESSION_CACHE_KEY,
      JSON.stringify({
        sourceType: 'live',
        lastUpdatedIso: fetchedIso,
        expiresAt,
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
      expiresAt,
    },
  };
}
