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
window.ADMIN_EMAILS = ["bing5201314@e1.ntps.kh.edu.tw"];
