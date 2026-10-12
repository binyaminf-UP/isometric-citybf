'use client';

import { useEffect } from 'react';

// רושם service worker (להתקנה למסך הבית) ומבקש מהדפדפן אחסון קבוע,
// כדי שהשמירה (localStorage) לא תימחק כשחסר מקום בטלפון.
export function PwaSetup() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    navigator.storage?.persist?.().catch(() => {});
  }, []);
  return null;
}
