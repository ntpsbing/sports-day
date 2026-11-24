/* 楠梓國小運動會即時通報系統 Service Worker
 * 用途：
 * 1. 讓 Android Chrome / iOS PWA 能呼叫 registration.showNotification() 顯示系統通知列與震動
 * 2. 點擊系統通知時自動切回已開啟的系統頁面
 * 注意：刻意不做離線快取，避免 GitHub Pages 更新後老師手機仍卡在舊版畫面
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
