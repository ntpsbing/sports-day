/* 楠梓國小運動會即時通報系統 Service Worker
 * 用途：
 * 1. 讓 Android Chrome / iOS PWA 能呼叫 registration.showNotification() 顯示系統通知列與震動
 * 2. 點擊系統通知時自動切回已開啟的系統頁面
 * 3. 接收 Apps Script 透過 FCM 送來的推播：網頁關著也會跳出通知（網頁正開在畫面上時，由網頁自己顯示，不重複跳）
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

/* 推播：Apps Script → FCM → 這裡。內容放在 data：{ title, body, tag, url } */
self.addEventListener('push', (event) => {
  let p = {};
  try { p = event.data ? event.data.json() : {}; } catch (e) { p = { data: { body: event.data ? event.data.text() : '' } }; }
  const d = Object.assign({}, p.notification || {}, p.data || {});
  const title = d.title || '運動會通知';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // 網頁開在畫面上時，正式通知由網頁自己叮咚＋顯示（不重複跳）；測試推播一律跳出，方便確認
      if (d.kind !== 'test' && list.some((c) => c.visibilityState === 'visible')) return;
      return self.registration.showNotification(title, {
        body: d.body || '', tag: d.tag || ('push-' + Date.now()), renotify: false,
        icon: 'icon-192.png', badge: 'icon-192.png', vibrate: [200, 100, 200], data: { url: d.url || './' }
      });
    })
  );
});
