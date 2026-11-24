import React from 'react';
import imgSit from '../assets/nung-meaw.png';
import imgSleep from '../assets/nung-meaw-sleep.png';
import imgPlay from '../assets/nung-meaw-play.png';
import imgRoll from '../assets/nung-meaw-roll.png';
import imgHappy from '../assets/nung-meaw-happy.png';

/**
 * พิกัดอ้างอิงเฉพาะแต่ละอิริยาบถ เพื่อให้หมวก แว่น ผ้าพันคอ และเสื้อสวมทับพอดีกับตัว 3D
 */
const POSE_META = {
  sit: {
    src: imgSit,
    vbW: 200,
    vbH: 250,
    widthPx: 118,
    head: { x: 88, y: 36, s: 1.0, r: 0 },
    eye: { x: 88, y: 76, s: 1.0, r: 0 },
    neck: { x: 88, y: 115, s: 1.0, r: 0 },
    torso: { x: 88, y: 120, s: 1.0, r: 0 },
    showTorsoOutfit: true,
    animClass: 'meaw-pose-sit',
  },
  happy: {
    src: imgHappy,
    vbW: 200,
    vbH: 268,
    widthPx: 114,
    head: { x: 96, y: 32, s: 1.02, r: 0 },
    eye: { x: 96, y: 74, s: 1.0, r: 0 },
    neck: { x: 96, y: 114, s: 1.02, r: 0 },
    torso: { x: 96, y: 118, s: 1.02, r: 0 },
    showTorsoOutfit: true,
    animClass: 'meaw-pose-happy',
  },
  peek: {
    src: imgSit,
    vbW: 200,
    vbH: 250,
    widthPx: 118,
    head: { x: 88, y: 36, s: 1.0, r: 0 },
    eye: { x: 88, y: 76, s: 1.0, r: 0 },
    neck: { x: 88, y: 115, s: 1.0, r: 0 },
    torso: { x: 88, y: 120, s: 1.0, r: 0 },
    showTorsoOutfit: true,
    animClass: 'meaw-pose-peek',
  },
  sleep: {
    src: imgSleep,
    vbW: 240,
    vbH: 172,
    widthPx: 136,
    head: { x: 66, y: 34, s: 0.94, r: -4 },
    eye: { x: 60, y: 80, s: 0.94, r: -2 },
    neck: { x: 92, y: 116, s: 0.95, r: -6 },
    torso: { x: 136, y: 92, s: 0.95, r: -10 },
    showTorsoOutfit: false,
    animClass: 'meaw-pose-sleep',
  },
  play: {
    src: imgPlay,
    vbW: 220,
    vbH: 233,
    widthPx: 132,
    head: { x: 142, y: 60, s: 0.9, r: 8 },
    eye: { x: 148, y: 102, s: 0.88, r: 8 },
    neck: { x: 126, y: 134, s: 0.88, r: 12 },
    torso: { x: 118, y: 140, s: 0.85, r: 14 },
    showTorsoOutfit: false,
    animClass: 'meaw-pose-play',
  },
  roll: {
    src: imgRoll,
    vbW: 220,
    vbH: 222,
    widthPx: 126,
    head: { x: 58, y: 170, s: 0.88, r: -130 },
    eye: { x: 76, y: 142, s: 0.88, r: -130 },
    neck: { x: 102, y: 116, s: 0.86, r: -130 },
    torso: { x: 110, y: 108, s: 0.86, r: -130 },
    showTorsoOutfit: false,
    animClass: 'meaw-pose-roll',
  },
};

function getOutfitColors(syncWithTheme) {
  if (syncWithTheme) {
    return {
      primary: 'var(--accent-primary, #ec4899)',
      secondary: 'var(--accent-secondary, #f472b6)',
      soft: 'var(--accent-soft, #fce7f3)',
      text: 'var(--accent-text, #be185d)',
    };
  }
  return {
    primary: '#38bdf8',
    secondary: '#7dd3fc',
    soft: '#e0f2fe',
    text: '#0369a1',
  };
}

function renderHeadAccessory(headId, colors) {
  switch (headId) {
    case 'bow':
      return (
        <g transform="translate(22, -6) rotate(16)">
          <path d="M0,0 C-14,-12 -22,-2 -18,8 C-14,14 -4,8 0,2 Z" fill={colors.primary} stroke="#fff" strokeWidth="1.4" />
          <path d="M0,0 C14,-12 22,-2 18,8 C14,14 4,8 0,2 Z" fill={colors.primary} stroke="#fff" strokeWidth="1.4" />
          <circle cx="0" cy="1" r="4.5" fill={colors.secondary} stroke="#fff" strokeWidth="1.2" />
        </g>
      );
    case 'cap':
      return (
        <g transform="translate(0, -10)">
          <path d="M-28,6 C-26,-16 26,-16 28,6 Z" fill="#ffffff" stroke={colors.primary} strokeWidth="2.2" />
          <path d="M-28,6 Q0,11 28,6 L26,12 Q0,16 -26,12 Z" fill={colors.primary} />
          <rect x="-4" y="-8" width="8" height="3" rx="1.2" fill={colors.primary} />
          <rect x="-1.5" y="-10.5" width="3" height="8" rx="1.2" fill={colors.primary} />
        </g>
      );
    case 'beanie':
      return (
        <g transform="translate(0, -10)">
          <circle cx="0" cy="-16" r="7" fill={colors.soft} stroke={colors.primary} strokeWidth="1.6" />
          <path d="M-28,4 C-26,-18 26,-18 28,4 Z" fill={colors.primary} />
          <rect x="-30" y="0" width="60" height="11" rx="5.5" fill={colors.secondary} stroke="#fff" strokeWidth="1.2" />
        </g>
      );
    case 'flower':
      return (
        <g transform="translate(-26, -2) rotate(-14)">
          <circle cx="0" cy="-8" r="5" fill={colors.soft} />
          <circle cx="8" cy="-2" r="5" fill={colors.soft} />
          <circle cx="5" cy="7" r="5" fill={colors.soft} />
          <circle cx="-5" cy="7" r="5" fill={colors.soft} />
          <circle cx="-8" cy="-2" r="5" fill={colors.soft} />
          <circle cx="0" cy="0" r="4.5" fill="#fbbf24" stroke="#fff" strokeWidth="1" />
        </g>
      );
    case 'crown':
      return (
        <g transform="translate(0, -14)">
          <path
            d="M-18,6 L-20,-10 L-7,-1 L0,-14 L7,-1 L20,-10 L18,6 Z"
            fill="#fbbf24"
            stroke="#fff7ed"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="0" cy="-2" r="2.6" fill={colors.primary} />
          <circle cx="-11" cy="1" r="2" fill="#38bdf8" />
          <circle cx="11" cy="1" r="2" fill="#38bdf8" />
        </g>
      );
    default:
      return null;
  }
}

function renderEyeAccessory(eyeId, colors) {
  switch (eyeId) {
    case 'round':
      return (
        <g>
          <circle cx="-23" cy="0" r="15" fill="rgba(255,255,255,0.16)" stroke="#f59e0b" strokeWidth="2.6" />
          <circle cx="23" cy="0" r="15" fill="rgba(255,255,255,0.16)" stroke="#f59e0b" strokeWidth="2.6" />
          <path d="M-8,-1 Q0,-5 8,-1" fill="none" stroke="#f59e0b" strokeWidth="2.4" />
        </g>
      );
    case 'sunglasses':
      return (
        <g>
          <rect x="-41" y="-12" width="33" height="22" rx="8" fill="#18181b" fillOpacity="0.88" stroke={colors.secondary} strokeWidth="2" />
          <rect x="8" y="-12" width="33" height="22" rx="8" fill="#18181b" fillOpacity="0.88" stroke={colors.secondary} strokeWidth="2" />
          <path d="M-8,-3 L8,-3" stroke={colors.secondary} strokeWidth="2.5" />
          <path d="M-34,-7 L-24,-7" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
          <path d="M15,-7 L25,-7" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case 'blush':
      return (
        <g opacity="0.72">
          <ellipse cx="-32" cy="14" rx="10" ry="5.5" fill="#fb7185" />
          <ellipse cx="32" cy="14" rx="10" ry="5.5" fill="#fb7185" />
        </g>
      );
    default:
      return null;
  }
}

function renderNeckAndTorso(outfitId, showTorsoOutfit, colors) {
  if (outfitId === 'none') return null;

  // สำหรับท่านอน/เล่น/กลิ้ง แสดงเป็นผ้าพันคอ/ผ้าห่ม/ปกเสื้อที่เข้ากับท่านั้นๆ
  if (outfitId === 'scarf' || !showTorsoOutfit) {
    if (outfitId === 'pajama' && !showTorsoOutfit) {
      return (
        <g>
          <path d="M-36,0 Q0,14 36,0 L42,26 Q0,36 -42,26 Z" fill="#a5b4fc" fillOpacity="0.88" stroke="#fff" strokeWidth="1.5" />
          <circle cx="-14" cy="14" r="3" fill="#fef08a" />
          <circle cx="16" cy="16" r="2.5" fill="#fef08a" />
        </g>
      );
    }
    return (
      <g>
        <path d="M-36,-2 Q0,16 36,-2 Q38,10 0,20 Q-38,10 -36,-2 Z" fill={colors.primary} stroke="#fff" strokeWidth="1.4" />
        <path d="M10,12 L22,36 L8,38 L0,16 Z" fill={colors.secondary} stroke="#fff" strokeWidth="1.2" />
      </g>
    );
  }

  switch (outfitId) {
    case 'labcoat':
      return (
        <g>
          {/* เสื้อกาวน์แพทย์/รพ.สต. */}
          <path
            d="M-42,4 L-12,0 L-6,64 L-48,60 C-52,42 -48,20 -42,4 Z"
            fill="#ffffff"
            fillOpacity="0.96"
            stroke="#cbd5e1"
            strokeWidth="1.8"
          />
          <path
            d="M42,4 L12,0 L6,64 L48,60 C52,42 48,20 42,4 Z"
            fill="#ffffff"
            fillOpacity="0.96"
            stroke="#cbd5e1"
            strokeWidth="1.8"
          />
          {/* ปกเสื้อ */}
          <path d="M-18,0 L-4,24 L-18,22 Z" fill={colors.soft} stroke="#cbd5e1" strokeWidth="1.2" />
          <path d="M18,0 L4,24 L18,22 Z" fill={colors.soft} stroke="#cbd5e1" strokeWidth="1.2" />
          {/* กระเป๋าเสื้อ + เครื่องหมายพยาบาล */}
          <rect x="16" y="30" width="18" height="16" rx="3" fill={colors.soft} stroke={colors.secondary} strokeWidth="1.2" />
          <rect x="23.5" y="33" width="3" height="10" rx="1" fill={colors.primary} />
          <rect x="20" y="36.5" width="10" height="3" rx="1" fill={colors.primary} />
          {/* หูฟังแพทย์ */}
          <path d="M-24,2 C-24,26 24,26 24,2" fill="none" stroke="#475569" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="0" cy="24" r="5" fill="#94a3b8" stroke="#334155" strokeWidth="1.5" />
        </g>
      );
    case 'hoodie':
      return (
        <g>
          <path
            d="M-44,2 Q0,14 44,2 C52,28 52,58 40,68 Q0,74 -40,68 C-52,58 -52,28 -44,2 Z"
            fill={colors.primary}
            fillOpacity="0.92"
            stroke="#fff"
            strokeWidth="1.8"
          />
          {/* เชือกฮู้ด */}
          <path d="M-10,6 L-12,26" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M10,6 L12,26" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="-12" cy="27" r="2.6" fill={colors.soft} />
          <circle cx="12" cy="27" r="2.6" fill={colors.soft} />
          {/* กระเป๋าหน้าท้อง + รอยเท้าแมว */}
          <path d="M-22,36 L22,36 L28,58 Q0,62 -28,58 Z" fill={colors.secondary} fillOpacity="0.9" />
          <circle cx="0" cy="49" r="4" fill={colors.soft} />
          <circle cx="-5" cy="43" r="1.8" fill={colors.soft} />
          <circle cx="0" cy="41.5" r="1.8" fill={colors.soft} />
          <circle cx="5" cy="43" r="1.8" fill={colors.soft} />
        </g>
      );
    case 'pajama':
      return (
        <g>
          <path
            d="M-42,2 Q0,12 42,2 C50,28 50,58 38,68 Q0,74 -38,68 C-50,58 -50,28 -42,2 Z"
            fill="#818cf8"
            fillOpacity="0.92"
            stroke="#e0e7ff"
            strokeWidth="1.8"
          />
          <line x1="0" y1="9" x2="0" y2="70" stroke="#e0e7ff" strokeWidth="1.6" />
          <circle cx="0" cy="22" r="2.4" fill="#fef08a" />
          <circle cx="0" cy="38" r="2.4" fill="#fef08a" />
          <circle cx="0" cy="54" r="2.4" fill="#fef08a" />
          <path d="M18,24 A7,7 0 1,0 26,33 A5.5,5.5 0 1,1 18,24 Z" fill="#fef08a" />
          <circle cx="-22" cy="34" r="2.5" fill="#fef08a" />
          <circle cx="-14" cy="50" r="2" fill="#fef08a" />
        </g>
      );
    case 'cape':
      return (
        <g>
          <path d="M-34,0 Q0,14 34,0 L30,10 Q0,22 -30,10 Z" fill={colors.primary} stroke="#fff" strokeWidth="1.4" />
          <polygon points="0,4 3,11 10,11 4,15 6,22 0,18 -6,22 -4,15 -10,11 -3,11" fill="#fbbf24" stroke="#fff" strokeWidth="1" />
        </g>
      );
    default:
      return null;
  }
}

export default function NungMeawFigure({
  pose = 'sit',
  outfitId = 'none',
  headId = 'none',
  eyeId = 'none',
  syncOutfitWithTheme = true,
  widthScale = 1,
  isDragging = false,
  isExcited = false,
  showHearts = false,
  showTreat = false,
  showBall = false,
  statusIcon = null,
}) {
  const effectivePose = POSE_META[pose] ? pose : 'sit';
  const meta = POSE_META[effectivePose];
  const colors = getOutfitColors(syncOutfitWithTheme);
  const renderedWidth = Math.round(meta.widthPx * widthScale);

  const animClass = isDragging
    ? 'meaw-pose-drag'
    : isExcited
      ? 'meaw-pose-excited'
      : meta.animClass;

  return (
    <div
      className={`meaw-figure-stage ${animClass}`}
      style={{ width: `${renderedWidth}px` }}
    >
      {/* ผ้าคลุมด้านหลัง (สำหรับชุด cape) */}
      {outfitId === 'cape' && meta.showTorsoOutfit && (
        <svg
          className="meaw-outfit-layer meaw-outfit-back"
          viewBox={`0 0 ${meta.vbW} ${meta.vbH}`}
          aria-hidden="true"
        >
          <g transform={`translate(${meta.torso.x}, ${meta.torso.y})`}>
            <path
              d="M-38,2 C-66,26 -72,62 -64,86 Q0,102 64,86 C72,62 66,26 38,2 Z"
              fill={colors.primary}
              fillOpacity="0.92"
              stroke={colors.secondary}
              strokeWidth="2"
            />
          </g>
        </svg>
      )}

      {/* ตัว 3D นุ้งเหมียว */}
      <img
        src={meta.src}
        alt="นุ้งเหมียว"
        className="meaw-figure-img"
        draggable={false}
      />

      {/* ชั้นชุดและเครื่องประดับด้านหน้า */}
      <svg
        className="meaw-outfit-layer meaw-outfit-front"
        viewBox={`0 0 ${meta.vbW} ${meta.vbH}`}
        aria-hidden="true"
      >
        {/* เสื้อ / ผ้าพันคอ */}
        {outfitId !== 'none' && (
          <g
            transform={`translate(${meta.showTorsoOutfit ? meta.torso.x : meta.neck.x}, ${
              meta.showTorsoOutfit ? meta.torso.y : meta.neck.y
            }) rotate(${meta.showTorsoOutfit ? meta.torso.r : meta.neck.r}) scale(${
              meta.showTorsoOutfit ? meta.torso.s : meta.neck.s
            })`}
          >
            {renderNeckAndTorso(outfitId, meta.showTorsoOutfit, colors)}
          </g>
        )}

        {/* แว่นตา / แก้มแดง */}
        {eyeId !== 'none' && (
          <g
            transform={`translate(${meta.eye.x}, ${meta.eye.y}) rotate(${meta.eye.r}) scale(${meta.eye.s})`}
          >
            {renderEyeAccessory(eyeId, colors)}
          </g>
        )}

        {/* หมวก / โบว์ / มงกุฎ */}
        {headId !== 'none' && (
          <g
            transform={`translate(${meta.head.x}, ${meta.head.y}) rotate(${meta.head.r}) scale(${meta.head.s})`}
          >
            {renderHeadAccessory(headId, colors)}
          </g>
        )}
      </svg>

      {/* เอฟเฟกต์หลับ Zzz */}
      {effectivePose === 'sleep' && !isDragging && (
        <div className="meaw-zzz-float" aria-hidden="true">
          <span>z</span>
          <span>Z</span>
          <span>z</span>
        </div>
      )}

      {/* เอฟเฟกต์หัวใจลอยเมื่อลูบหัว / ดีใจ */}
      {showHearts && (
        <div className="meaw-hearts-float" aria-hidden="true">
          <span>💗</span>
          <span>✨</span>
          <span>💖</span>
        </div>
      )}

      {/* เอฟเฟกต์ขนมปลาทู */}
      {showTreat && (
        <div className="meaw-treat-float" aria-hidden="true">
          🐟
        </div>
      )}

      {/* ลูกบอลเด้งเล่นเพิ่ม */}
      {showBall && (
        <div className="meaw-toy-ball" aria-hidden="true" />
      )}

      {/* สัญลักษณ์อารมณ์ตามสถานะระบบ */}
      {statusIcon && (
        <div className="meaw-status-pill" aria-hidden="true">
          <i className={`bi ${statusIcon}`} />
        </div>
      )}
    </div>
  );
}
