// יוצר את אייקוני ה-PWA. הרצה: node scripts/make-icons.mjs
import sharp from 'sharp';
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#0f1219"/>
<g transform="translate(256 256) scale(${1-pad}) translate(-256 -256)">
  <path d="M256 110 L420 205 L256 300 L92 205 Z" fill="#1f2a3d" stroke="#3b82f6" stroke-width="10" stroke-linejoin="round"/>
  <path d="M92 205 L92 275 L256 370 L256 300 Z" fill="#162033"/>
  <path d="M420 205 L420 275 L256 370 L256 300 Z" fill="#101827"/>
  <path d="M150 215 L256 276 L362 215" fill="none" stroke="#fbbf24" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="150" cy="215" r="20" fill="#0f1219" stroke="#fbbf24" stroke-width="10"/>
  <circle cx="362" cy="215" r="20" fill="#0f1219" stroke="#fbbf24" stroke-width="10"/>
  <circle cx="256" cy="276" r="20" fill="#0f1219" stroke="#fbbf24" stroke-width="10"/>
</g></svg>`;
const out = '';
const jobs = [['public/icons/icon-192.png',192,0.0],['public/icons/icon-512.png',512,0.0],['public/icons/icon-maskable-512.png',512,0.22],['public/icons/apple-touch-icon.png',180,0.0],['src/app/icon.png',64,0.0]];
for (const [f,size,pad] of jobs) await sharp(Buffer.from(svg(pad))).resize(size,size).png().toFile(out+f);
console.log('ok');
