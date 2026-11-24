/* =========================================================
   楠梓國小 運動會即時通報系統：手機推播（Google Apps Script）
   用途：每分鐘檢查資料庫有沒有新的「通知老師」，有就用兩條路送出：
        ① Email 到老師的學校 Gmail：任何手機的 Gmail App 都會跳通知（不用任何手機設定，最通用）
        ② 手機推播：老師在網站允許通知的裝置，瀏覽器關掉也會跳（要先完成推播金鑰設定）
   設定步驟請看同資料夾的「設定說明.md」。
   ▶ 接手的老師：通常不用改程式，只要照說明做一次「設定」。
   ========================================================= */

/* ---------- 可以調整的設定 ---------- */
var PROJECT_ID = 'nanzi-sportsday';                         // Firebase 專案 ID（config.js 裡的 projectId）
var SITE_URL   = 'https://ntpsbing.github.io/sports-day/';  // 點通知要打開的網址
var LOOKBACK_MIN = 10;                                      // 只推送最近幾分鐘內發出的通知
var EMAIL_ON   = true;                                      // 是否同時寄 Email 到老師的學校信箱（true 寄／false 不寄）
var MAIL_NAME  = '楠梓國小運動會';                           // 寄件人顯示名稱

/* ---------- 1. 第一次使用：執行這個函式（會建立「每分鐘自動檢查」） ---------- */
function 設定() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === '檢查並推播') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('檢查並推播').timeBased().everyMinutes(1).create();
  var n = 讀取裝置_().length, m = 讀取收件人_().length;
  Logger.log('✔ 已設定每分鐘自動檢查。Email 收件人：' + m + ' 位；登記手機推播的裝置：' + n + ' 台');
}

/* ---------- 2. 測試：送一則測試推播到所有登記的裝置 ---------- */
function 測試推播() {
  if (EMAIL_ON) {
    var me = Session.getEffectiveUser().getEmail();
    寄信_([me], { body: '看到這封代表 Email 通知設定成功！' + 時間_() });
    Logger.log('✔ 已寄測試信到 ' + me + '（手機 Gmail App 應該會跳通知）');
  }
  var tokens = 讀取裝置_();
  if (!tokens.length) { Logger.log('還沒有任何裝置登記推播。請老師在網站右上角 🔔 開啟通知。'); return; }
  if (!tokens.length) return;
  var r = 送出_(tokens, { title: '運動會通知（測試）', body: '看到這則代表推播設定成功！' + 時間_(), tag: 'test-' + Date.now() });
  Logger.log('✔ 已送出測試推播：成功 ' + r.ok + ' 台、失敗 ' + r.fail + ' 台（失效的裝置已自動清除 ' + r.removed + ' 台）');
}

/* ---------- 3. 停用：運動會結束後執行，停止每分鐘檢查 ---------- */
function 停用() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  Logger.log('✔ 已停止自動推播');
}

/* ---------- 每分鐘自動執行 ---------- */
function 檢查並推播() {
  var props = PropertiesService.getScriptProperties();
  var sent = JSON.parse(props.getProperty('SENT') || '{}');      // 已推送過的通知（避免重複）
  var cutoff = Date.now() - LOOKBACK_MIN * 60 * 1000;
  var notices = 讀取新通知_(cutoff).filter(function (n) { return !sent[n.id]; });
  if (!notices.length) return;                                    // 沒有新通知：結束（不讀裝置清單，省額度）

  var tokens = 讀取裝置_();
  var people = EMAIL_ON ? 讀取收件人_() : [];
  notices.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); }).forEach(function (n) {
    var targets = tokens.filter(function (t) { return !t.dead && 是對象_(t, n); });
    if (targets.length) {
      var r = 送出_(targets, { title: '運動會通知', body: String(n.text || ''), tag: String(n.id) });
      Logger.log('推播「' + String(n.text).slice(0, 20) + '」→ ' + r.ok + ' 台成功、' + r.fail + ' 台失敗');
    }
    if (EMAIL_ON) {
      var mails = people.filter(function (p) { return 是對象_(p, n); }).map(function (p) { return p.email; });
      if (n.to === 'me' && n.byEmail && mails.indexOf(String(n.byEmail).toLowerCase()) < 0) mails.push(String(n.byEmail).toLowerCase());
      if (mails.length) { 寄信_(mails, { body: String(n.text || ''), by: n.by, at: n.at }); Logger.log('Email「' + String(n.text).slice(0, 20) + '」→ ' + mails.length + ' 位'); }
    }
    sent[n.id] = Date.now();
  });
  // 只保留一天內的紀錄
  var dayAgo = Date.now() - 86400000;
  Object.keys(sent).forEach(function (k) { if (sent[k] < dayAgo) delete sent[k]; });
  props.setProperty('SENT', JSON.stringify(sent));
}

/* 通知對象：all 全體人員、teachers 全體導師（每個學校帳號都是）、staff 全體工作人員、me 自己（測試） */
function 是對象_(t, n) {
  var to = n.to || 'all';
  if (to === 'all' || to === 'teachers') return true;
  if (to === 'me') return t.email && t.email === String(n.byEmail || '').toLowerCase();
  if (to === 'staff') return (t.roles || []).some(function (r) { return r !== 'teacher' && r !== 'public'; });
  return (t.roles || []).indexOf(to) >= 0;
}

/* ---------- 資料庫（Firestore REST） ---------- */
function 讀取新通知_(cutoff) {
  var url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents:runQuery';
  var body = { structuredQuery: {
    from: [{ collectionId: 'broadcasts' }],
    where: { fieldFilter: { field: { fieldPath: 'ts' }, op: 'GREATER_THAN', value: { integerValue: String(cutoff) } } },
    limit: 100 } };
  var res = 呼叫_(url, 'post', body);
  return (res || []).filter(function (r) { return r.document; }).map(function (r) {
    var o = 解析_(r.document.fields || {}); o.id = o.id || r.document.name.split('/').pop(); return o;
  }).filter(function (o) { return o.type === 'notice' && !o.cancelled && o.text; });
}
function 讀取裝置_() {
  try { return 讀取裝置清單_(); } catch (e) { Logger.log('讀取推播裝置失敗（還沒設定推播可以忽略）：' + e.message); return []; }
}
function 讀取裝置清單_() {
  var out = [], pageToken = '';
  do {
    var url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/pushTokens?pageSize=300' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
    var res = 呼叫_(url, 'get');
    (res.documents || []).forEach(function (d) { var o = 解析_(d.fields || {}); o.token = d.name.split('/').pop(); o.docName = d.name; out.push(o); });
    pageToken = res.nextPageToken || '';
  } while (pageToken);
  return out;
}
function 刪除裝置_(docName) {
  try { 呼叫_('https://firestore.googleapis.com/v1/' + docName, 'delete'); } catch (e) {}
}
function 解析_(fields) {
  var o = {}; Object.keys(fields).forEach(function (k) { o[k] = 值_(fields[k]); }); return o;
}
function 值_(v) {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return Number(v.doubleValue);
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(值_);
  if (v.mapValue !== undefined) return 解析_(v.mapValue.fields || {});
  return null;
}

/* ---------- Email：收件人＝「帳號與權限」設定過的人＋登入過網站的人 ---------- */
function 讀取收件人_() {
  var map = {};
  列出_('roles').forEach(function (d) {
    var em = d.id.toLowerCase(); if (em.indexOf('@') < 0) return;
    var rs = Array.isArray(d.roles) && d.roles.length ? d.roles : (d.role ? [d.role] : []);
    map[em] = { email: em, roles: rs.concat(['teacher']) };
  });
  列出_('users').forEach(function (d) {
    var em = String(d.email || d.id).toLowerCase(); if (em.indexOf('@') < 0) return;
    if (!map[em]) map[em] = { email: em, roles: ['teacher'] };
  });
  return Object.keys(map).map(function (k) { return map[k]; });
}
function 列出_(col) {
  var out = [], pageToken = '';
  do {
    var url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/' + col + '?pageSize=300' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
    var res = 呼叫_(url, 'get');
    (res.documents || []).forEach(function (d) { var o = 解析_(d.fields || {}); o.id = decodeURIComponent(d.name.split('/').pop()); out.push(o); });
    pageToken = res.nextPageToken || '';
  } while (pageToken);
  return out;
}
/* 一封信最多 50 位收件人（密件副本，彼此看不到信箱）；額度不夠時記錄下來 */
function 寄信_(mails, n) {
  var subject = '【運動會通知】' + String(n.body).slice(0, 40);
  var html = '<div style="font-family:sans-serif;font-size:17px;line-height:1.6">'
    + '<div style="background:#0E4D8C;color:#fff;padding:12px 16px;border-radius:10px 10px 0 0;font-weight:bold">📢 楠梓國小運動會通知</div>'
    + '<div style="border:1px solid #DBE1DA;border-top:0;padding:16px;border-radius:0 0 10px 10px">'
    + '<p style="font-size:20px;font-weight:bold;margin:0 0 8px">' + 轉義_(n.body) + '</p>'
    + '<p style="color:#4A5B6B;margin:0 0 14px">' + 轉義_((n.at ? n.at + '・' : '') + (n.by || '大會')) + '</p>'
    + '<a href="' + SITE_URL + '#start" style="display:inline-block;background:#1565B5;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:bold">打開運動會系統</a>'
    + '</div><p style="color:#8A9BAC;font-size:13px">這封信由運動會即時通報系統自動寄出，不用回信。</p></div>';
  var me = Session.getEffectiveUser().getEmail();
  for (var i = 0; i < mails.length; i += 50) {
    var chunk = mails.slice(i, i + 50);
    if (MailApp.getRemainingDailyQuota() < chunk.length) { Logger.log('⚠ 今天的寄信額度不夠，剩下 ' + (mails.length - i) + ' 位沒寄到'); return; }
    MailApp.sendEmail({ to: me, bcc: chunk.join(','), subject: subject, htmlBody: html, body: n.body + '\n' + SITE_URL, name: MAIL_NAME });
  }
}
function 轉義_(t) { return String(t || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/* ---------- 推播（FCM HTTP v1） ---------- */
function 送出_(tokens, msg) {
  var url = 'https://fcm.googleapis.com/v1/projects/' + PROJECT_ID + '/messages:send';
  var auth = 授權標頭_();
  var reqs = tokens.map(function (t) {
    return { url: url, method: 'post', contentType: 'application/json', headers: auth, muteHttpExceptions: true,
      payload: JSON.stringify({ message: { token: t.token,
        data: { title: msg.title, body: msg.body, tag: msg.tag, url: SITE_URL + '#start' },
        webpush: { headers: { Urgency: 'high', TTL: '900' } } } }) };
  });
  var ok = 0, fail = 0, removed = 0;
  for (var i = 0; i < reqs.length; i += 50) {                     // 每次最多同時 50 台
    UrlFetchApp.fetchAll(reqs.slice(i, i + 50)).forEach(function (res, j) {
      var code = res.getResponseCode();
      if (code === 200) { ok++; return; }
      fail++;
      var txt = res.getContentText();
      if (code === 404 || /UNREGISTERED|registration-token-not-registered|INVALID_ARGUMENT/.test(txt)) { 刪除裝置_(tokens[i + j].docName); tokens[i + j].dead = true; removed++; }
      else Logger.log('推播失敗（' + code + '）：' + txt.slice(0, 200));
    });
  }
  return { ok: ok, fail: fail, removed: removed };
}

/* ---------- 授權 ----------
   預設用「執行這個程式的 Google 帳號」（必須是 Firebase 專案的擁有者）。
   如果學校帳號不能用，改用服務帳號：把 Firebase 下載的服務帳號金鑰 JSON 整段貼到
   「專案設定 → 指令碼屬性」，名稱 SERVICE_ACCOUNT（詳見設定說明.md 的「備用做法」）。 */
function 授權標頭_() {
  var sa = PropertiesService.getScriptProperties().getProperty('SERVICE_ACCOUNT');
  if (sa) return { Authorization: 'Bearer ' + 服務帳號權杖_(JSON.parse(sa)) };
  // x-goog-user-project：讓這次呼叫算在 Firebase 專案（不然會被算在 Apps Script 內建的專案而被拒絕）
  return { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': PROJECT_ID };
}
function 服務帳號權杖_(sa) {
  var cache = CacheService.getScriptCache(), hit = cache.get('SA_TOKEN');
  if (hit) return hit;
  var now = Math.floor(Date.now() / 1000);
  var enc = function (o) { return Utilities.base64EncodeWebSafe(JSON.stringify(o)).replace(/=+$/, ''); };
  var head = enc({ alg: 'RS256', typ: 'JWT' });
  var claim = enc({ iss: sa.client_email, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging' });
  var sig = Utilities.base64EncodeWebSafe(Utilities.computeRsaSha256Signature(head + '.' + claim, sa.private_key)).replace(/=+$/, '');
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', { method: 'post', muteHttpExceptions: true,
    payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: head + '.' + claim + '.' + sig } });
  var tok = JSON.parse(res.getContentText()).access_token;
  if (!tok) throw new Error('服務帳號取得權杖失敗：' + res.getContentText().slice(0, 200));
  cache.put('SA_TOKEN', tok, 3000);
  return tok;
}
function 呼叫_(url, method, body) {
  var opt = { method: method, headers: 授權標頭_(), muteHttpExceptions: true, contentType: 'application/json' };
  if (body) opt.payload = JSON.stringify(body);
  var res = UrlFetchApp.fetch(url, opt), code = res.getResponseCode(), txt = res.getContentText();
  if (code >= 300) throw new Error('資料庫讀取失敗（' + code + '）：' + txt.slice(0, 300));
  return txt ? JSON.parse(txt) : {};
}
function 時間_() { return Utilities.formatDate(new Date(), 'Asia/Taipei', '（HH:mm）'); }
