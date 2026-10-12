// Service worker מינימלי: נדרש להתקנה למסך הבית. אין מטמון, כדי שגרסה חדשה תמיד תיטען מיד אחרי פריסה.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
