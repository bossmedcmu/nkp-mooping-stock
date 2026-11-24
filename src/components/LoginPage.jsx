import React, { useState } from 'react';
import nungMeawImg from '../assets/nung-meaw.png';
import {
  getRateLimitStatus,
  isDevFallbackMode,
  verifyCredentials,
} from '../utils/authCrypto.js';

export default function LoginPage({
  onLoginSuccess,
  colorMode,
  onToggleColorMode,
  themePreference,
  onToggleThemePreference,
  todayThemeInfo,
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const devMode = isDevFallbackMode();
  const rateStatus = getRateLimitStatus();

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const result = await verifyCredentials(username, password);
      if (result.ok) {
        onLoginSuccess(result.session);
      } else {
        setErrorMsg(result.message || 'ไม่สามารถเข้าสู่ระบบได้');
      }
    } catch {
      setErrorMsg('เกิดข้อผิดพลาดในการตรวจสอบข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-vh-100 d-flex flex-column justify-content-between align-items-center px-3 py-3 position-relative">
      <div className="w-100 d-flex justify-content-end gap-2 mb-2">
        <button
          type="button"
          className="btn btn-sm btn-pastel-soft px-3"
          onClick={onToggleThemePreference}
          title="สลับโทนสีตามวัน / ชมพูอ่อน"
        >
          <i className="bi bi-palette2 me-1" />
          {themePreference === 'auto' ? `สีประจำ${todayThemeInfo.shortName}` : 'ชมพูอ่อน'}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-pastel-soft px-3"
          onClick={onToggleColorMode}
          title="สลับโหมดสว่าง / โหมดมืด"
        >
          <i className={`bi ${colorMode === 'dark' ? 'bi-sun-fill' : 'bi-moon-stars-fill'} me-1`} />
          {colorMode === 'dark' ? 'โหมดสว่าง' : 'โหมดมืด'}
        </button>
      </div>

      <div className="pastel-card p-4 p-md-5 w-100 my-auto" style={{ maxWidth: 440 }}>
        <div className="text-center mb-3">
          <img
            src={nungMeawImg}
            alt="นุ้งเหมียวผู้ช่วยแดชบอร์ด"
            className="login-hero-cat mb-2"
          />
          <span className="badge badge-pastel px-3 py-2 mb-2 d-inline-block">
            <i className="bi bi-heart-pulse-fill me-1" />
            ระบบสนับสนุนเครือข่ายบริการปฐมภูมิ
          </span>
          <h1 className="h4 fw-bold mb-1">เข้าสู่ระบบวิเคราะห์ข้อมูล รพ.สต.</h1>
          <p className="text-muted-theme small mb-0">
            งานสนับสนุนส่งสิ่งส่งตรวจ (Lab) และทะเบียนเบิกยาเครือข่าย
          </p>
        </div>

        {errorMsg && (
          <div className="alert alert-danger py-2 px-3 rounded-4 small mb-3" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2" />
            {errorMsg}
          </div>
        )}

        {rateStatus.locked && !errorMsg && (
          <div className="alert alert-warning py-2 px-3 rounded-4 small mb-3" role="alert">
            <i className="bi bi-hourglass-split me-2" />
            กรุณารอ {rateStatus.remainingSeconds} วินาทีก่อนลองใหม่อีกครั้ง
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="login-username" className="form-label small fw-semibold">
              ชื่อผู้ใช้งาน
            </label>
            <div className="input-group">
              <span className="input-group-text rounded-start-pill bg-transparent border-end-0">
                <i className="bi bi-person-fill text-accent" />
              </span>
              <input
                id="login-username"
                type="text"
                className="form-control rounded-end-pill border-start-0"
                placeholder="กรอกชื่อผู้ใช้งาน"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="login-password" className="form-label small fw-semibold">
              รหัสผ่าน
            </label>
            <div className="input-group">
              <span className="input-group-text rounded-start-pill bg-transparent border-end-0">
                <i className="bi bi-shield-lock-fill text-accent" />
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-control border-start-0 border-end-0"
                placeholder="กรอกรหัสผ่าน"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="btn btn-outline-secondary rounded-end-pill border-start-0"
                onClick={() => setShowPassword((v) => !v)}
                aria-label="แสดงหรือซ่อนรหัสผ่าน"
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-pastel-primary w-100 py-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                กำลังตรวจสอบสิทธิ์...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right me-2" />
                เข้าสู่ระบบแดชบอร์ด
              </>
            )}
          </button>
        </form>

        {devMode && (
          <div className="mt-3 p-2 rounded-4 text-center small text-muted-theme" style={{ background: 'var(--accent-soft)' }}>
            โหมดทดสอบในเครื่อง: ชื่อผู้ใช้ <strong>admin</strong> / รหัสผ่าน <strong>1234</strong>
          </div>
        )}
      </div>
      <div className="py-2" />
    </div>
  );
}
