import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function getBangkokBuildIso() {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = {};
  for (const part of formatter.formatToParts(new Date())) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  const hour = Number(parts.hour) === 24 ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}+07:00`;
}

export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    __APP_BUILD_TIME_ISO__: JSON.stringify(getBangkokBuildIso()),
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
