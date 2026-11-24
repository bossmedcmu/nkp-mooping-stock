/**
 * ระบบยืนยันตัวตนฝั่งผู้ใช้โดยเทียบค่า Salted SHA-256 Hash ที่สร้างในขั้นตอน Build
 * ไม่เก็บ Username/Password จริงไว้ในโค้ด
 */

const SESSION_KEY = 'nkp_pcu_auth_session_v1';
const ATTEMPT_KEY = 'nkp_pcu_auth_attempts_v1';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 ชั่วโมง
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 30 * 1000; // 30 วินาที

async function sha256Hex(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeHexEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function isAuthConfigured() {
  const salt = import.meta.env.VITE_AUTH_SALT;
  const userHash = import.meta.env.VITE_AUTH_USER_HASH;
  const passHash = import.meta.env.VITE_AUTH_PASS_HASH;
  if (salt && userHash && passHash) return true;
  return Boolean(import.meta.env.DEV);
}

export function isDevFallbackMode() {
  const salt = import.meta.env.VITE_AUTH_SALT;
  const userHash = import.meta.env.VITE_AUTH_USER_HASH;
  const passHash = import.meta.env.VITE_AUTH_PASS_HASH;
  return Boolean(import.meta.env.DEV && (!salt || !userHash || !passHash));
}

export function getRateLimitStatus() {
  try {
    const raw = sessionStorage.getItem(ATTEMPT_KEY);
    if (!raw) return { locked: false, remainingSeconds: 0, count: 0 };
    const parsed = JSON.parse(raw);
    const now = Date.now();
    if (parsed.lockedUntil && parsed.lockedUntil > now) {
      return {
        locked: true,
        remainingSeconds: Math.ceil((parsed.lockedUntil - now) / 1000),
        count: parsed.count || MAX_ATTEMPTS,
      };
    }
    return { locked: false, remainingSeconds: 0, count: parsed.count || 0 };
  } catch {
    return { locked: false, remainingSeconds: 0, count: 0 };
  }
}

function recordFailedAttempt() {
  try {
    const current = getRateLimitStatus();
    const nextCount = (current.count || 0) + 1;
    const lockedUntil = nextCount >= MAX_ATTEMPTS ? Date.now() + COOLDOWN_MS : 0;
    sessionStorage.setItem(
      ATTEMPT_KEY,
      JSON.stringify({
        count: lockedUntil ? 0 : nextCount,
        lockedUntil,
      })
    );
  } catch {
    // ignore storage errors
  }
}

function resetFailedAttempts() {
  try {
    sessionStorage.removeItem(ATTEMPT_KEY);
  } catch {
    // ignore
  }
}

export async function verifyCredentials(usernameInput, passwordInput) {
  const rate = getRateLimitStatus();
  if (rate.locked) {
    return {
      ok: false,
      reason: 'locked',
      remainingSeconds: rate.remainingSeconds,
      message: `กรอกรหัสผิดเกินกำหนด กรุณารอ ${rate.remainingSeconds} วินาที`,
    };
  }

  const normalizedUser = String(usernameInput || '').trim().toLowerCase();
  const password = String(passwordInput || '');

  if (!normalizedUser || !password) {
    return { ok: false, reason: 'empty', message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน' };
  }

  let salt = import.meta.env.VITE_AUTH_SALT || '';
  let expectedUserHash = import.meta.env.VITE_AUTH_USER_HASH || '';
  let expectedPassHash = import.meta.env.VITE_AUTH_PASS_HASH || '';

  if (!salt || !expectedUserHash || !expectedPassHash) {
    if (import.meta.env.DEV) {
      // โหมดพัฒนาบนเครื่องท้องถิ่นเท่านั้น (ไม่ทำงานใน Production)
      salt = 'local-dev-preview-salt';
      expectedUserHash = await sha256Hex(`${salt}:admin`);
      expectedPassHash = await sha256Hex(`${salt}:1234`);
    } else {
      return {
        ok: false,
        reason: 'unconfigured',
        message: 'ยังไม่ได้ตั้งค่าบัญชีผู้ใช้งานในระบบ กรุณาติดต่อผู้ดูแลระบบ',
      };
    }
  }

  const inputUserHash = await sha256Hex(`${salt}:${normalizedUser}`);
  const inputPassHash = await sha256Hex(`${salt}:${password}`);

  const userMatch = timingSafeHexEqual(inputUserHash, expectedUserHash);
  const passMatch = timingSafeHexEqual(inputPassHash, expectedPassHash);

  if (!userMatch || !passMatch) {
    recordFailedAttempt();
    const afterRate = getRateLimitStatus();
    if (afterRate.locked) {
      return {
        ok: false,
        reason: 'locked',
        remainingSeconds: afterRate.remainingSeconds,
        message: `ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณารอ ${afterRate.remainingSeconds} วินาที`,
      };
    }
    return {
      ok: false,
      reason: 'invalid',
      message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    };
  }

  resetFailedAttempts();
  const session = {
    username: String(usernameInput).trim(),
    loggedInAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
  return { ok: true, session };
}

export function getActiveSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.expiresAt || Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
