/* =========================================================
   運動會即時通報系統：學校設定檔（交接時只需要改這個檔案＋firestore.rules）
   1. FIREBASE_CONFIG：到 Firebase 主控台 → 專案設定 → 你的應用程式 → 「SDK 設定和配置」複製貼上
   2. SCHOOL_DOMAIN：只允許這個網域的 Google 帳號登入
   3. ADMIN_EMAILS：系統管理員（可建立資料、設定各組權限）
   ※ 這裡的 apiKey 是公開識別碼，不是密碼；資料安全由 firestore.rules 把關。
   ========================================================= */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCBp19ix7Ps4PgytFu03K6jXyBOGEUoX-s",
  authDomain: "nanzi-sportsday.firebaseapp.com",
  projectId: "nanzi-sportsday",
  storageBucket: "nanzi-sportsday.firebasestorage.app",
  messagingSenderId: "1078770805752",
  appId: "1:1078770805752:web:243d0617cb6c655b36c40d"
};
window.SCHOOL_DOMAIN = "e1.ntps.kh.edu.tw";
// 只有教職員帳號（tc 開頭＋數字）能登入；學生帳號會被擋下。例外帳號請由管理員在「帳號權限」設定組別即可登入
window.STAFF_PATTERN = "^tc[0-9]+@";
window.ADMIN_EMAILS = ["bing5201314@e1.ntps.kh.edu.tw"];
// 校徽：校徽圖檔（SVG 最清楚；PNG 也可，建議正方形、透明背景、至少 200×200）放在和 index.html 同一個資料夾。
// 檔名不同就改這裡；找不到圖檔時，左上角會自動顯示「楠」字圓章。
window.SCHOOL_LOGO = "logo.svg";
// 校長姓名：系統預設的「○○○ 校長」會自動換成這個名字（看板、司儀稿、頒獎人、成績單都會用到）
window.PRINCIPAL_NAME = "鍾榮茂";
// 推播金鑰（讓手機在瀏覽器關掉時也收得到通知）：Firebase 主控台 → 專案設定 → Cloud Messaging → 網路設定「網路推播憑證」→ 產生金鑰組，把「金鑰組」那一長串貼在下面。
// 這是公開金鑰，放在這裡是安全的。空白時就只有網頁開著才收得到通知。
window.FCM_VAPID_KEY = "BGngxASzdI-CqZ-R-8R93k9WJ0ftvfUnmXPpowOEku3W01oTnAl0No-32iO2XsXFtD5RonNxt6GOjexpX9yg5h8";
/* 立即推播（可不填）：Apps Script「部署 → 網頁應用程式」的網址。填了以後，通知一送出就馬上寄信／推播（約 5～10 秒）；
   沒填就靠每分鐘自動檢查（約 1～2 分鐘）。設定方法見 apps-script/設定說明.md */
window.PUSH_HOOK_URL = "https://script.google.com/macros/s/AKfycbwf8A5oQ2K0s9NXx-5bowiUVzDBB2elHHNmfyWCzRV9jtKySdFdJcJXPaijujv4Fzvw/exec";
