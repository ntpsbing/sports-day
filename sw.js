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

/* 「已看到」紀錄：點開、滑掉通知，或在網頁按「知道了」→ 記下來，之後的重複提醒就不再響
   存在 Cache Storage（網頁和這裡都讀得到，服務程式被系統關掉也不會不見） */
const ACK = 'nanzi-ack';
const ackKey = (tag) => new Request('./__ack__/' + encodeURIComponent(tag));
const ack = (tag) => tag ? caches.open(ACK).then((c) => c.put(ackKey(tag), new Response('1'))).catch(() => {}) : Promise.resolve();
const acked = (tag) => caches.open(ACK).then((c) => c.match(ackKey(tag))).then((r) => !!r).catch(() => false);
const baseTag = (t) => String(t || '').replace(/~r\d+$/, '');
const isIOS = /iPhone|iPad|iPod/.test(self.navigator.userAgent || '');

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    ack(baseTag(event.notification.tag)).then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true })).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow((event.notification.data && event.notification.data.url) || './');
    })
  );
});
// 滑掉通知＝看到了
self.addEventListener('notificationclose', (event) => { event.waitUntil(ack(baseTag(event.notification.tag))); });

/* 推播：Apps Script → FCM → 這裡。內容放在 data：{ title, body, tag, url, kind, round }
   kind=repeat：沒點開的通知每分鐘再響一次；已看到就不響 */
self.addEventListener('push', (event) => {
  let p = {};
  try { p = event.data ? event.data.json() : {}; } catch (e) { p = { data: { body: event.data ? event.data.text() : '' } }; }
  const d = Object.assign({}, p.notification || {}, p.data || {});
  const round = Number(d.round || 0), repeat = d.kind === 'repeat';
  const tag = d.tag || ('push-' + Date.now());
  const title = (d.title || '運動會通知') + (repeat ? '（再次提醒）' : '');
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // 網頁開在畫面上時，由網頁自己響鈴＋顯示（不重複跳）；測試推播一律跳出，方便確認
    if (d.kind !== 'test' && list.some((c) => c.visibilityState === 'visible')) return;
    if (repeat && await acked(tag)) return;
    // iPhone 不支援「同一則重新響」，改成換一個標籤並把前一則收掉
    let showTag = tag;
    if (repeat && isIOS) {
      showTag = tag + '~r' + round;
      (await self.registration.getNotifications()).forEach((n) => { if (baseTag(n.tag) === tag) n.close(); });
    }
    return self.registration.showNotification(title, {
      // requireInteraction：通知留在畫面上直到按掉；renotify：重複提醒時再響一次；長震動約 2 秒（Android）
      body: d.body || '', tag: showTag, renotify: repeat, requireInteraction: true, silent: false,
      icon: 'icon-192.png', badge: 'icon-192.png', vibrate: [500, 150, 500, 150, 800], data: { url: d.url || './' }
    });
  })());
});
