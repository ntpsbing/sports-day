# 楠梓國小 運動會即時通報系統（正式版）部署與交接說明

## 這個資料夾裡有什麼

| 檔案 | 用途 | 交接時要不要改 |
|---|---|---|
| `index.html` | 系統本體（全部頁面都在這一個檔） | 不用 |
| `config.js` | 學校設定：Firebase 連線、學校網域、系統管理員 | **要** |
| `firestore.rules` | 雲端資料庫安全規則（誰能改什麼） | **要**（管理員帳號） |
| `firebase.json` | 規則部署用設定 | 不用 |
| `運動會成績登錄範本.xlsx` | 會前賽成績 Excel 範本 | 不用 |

`config.js` 的 `apiKey` 空白時，系統會以「體驗版」執行（資料只存在自己電腦），可以先上線給大家看畫面。

---

## 一次性部署（約 15 分鐘，用學校 Google 帳號）

### 步驟 1：建立 Firebase 專案
1. 打開 https://console.firebase.google.com ，用學校帳號登入。
2. 「建立專案」→ 名稱輸入 `nanzi-sportsday` → Google Analytics 選「不啟用」→ 建立。

### 步驟 2：開啟資料庫（Firestore）
1. 左側「建構」→「Firestore Database」→「建立資料庫」。
2. 位置選 **asia-east1（台灣）**→ 選「以正式模式啟動」→ 建立。
3. 上方「規則」分頁 → 把 `firestore.rules` 的內容整段貼上取代 → 「發布」。

### 步驟 3：開啟學校帳號登入
1. 左側「建構」→「Authentication」→「開始使用」。
2. 「登入方式」→ 選「Google」→ 啟用 → 專案支援電子郵件選自己 → 儲存。
3. 「設定」→「授權網域」→ 新增 `ntpsbing.github.io`（步驟 5 的網址網域）。

### 步驟 4：取得連線設定，貼到 config.js
1. 專案總覽旁齒輪 →「專案設定」→ 下方「你的應用程式」→ 點 `</>`（網頁）。
2. 暱稱輸入 `sportsday` → 註冊應用程式（不用勾 Hosting）。
3. 畫面會出現 `const firebaseConfig = { apiKey: ..., ... }`，把大括號裡 6 行複製，貼到 `config.js` 的 `window.FIREBASE_CONFIG = { ... }` 裡。

### 步驟 5：放到網路上（GitHub Pages）
1. 打開 https://github.com/new ，Repository name 輸入 `sports-day`，選 **Public** → Create repository。
2. 在新 repo 頁面點「uploading an existing file」，把這個資料夾的 **全部檔案** 拖進去 → Commit changes。
3. 「Settings」→ 左側「Pages」→ Source 選「Deploy from a branch」→ Branch 選 `main`、`/ (root)` → Save。
4. 約 1 分鐘後，網址是：**https://ntpsbing.github.io/sports-day/**

### 步驟 6：第一次登入與建立資料
1. 打開網址 → 右上角「學校帳號登入」（用 `config.js` 裡的管理員帳號）。
2. 總控台會出現「正式資料庫還是空的」→ 按「建立正式資料」。
3. 到「積分與設定」→「帳號權限」：輸入各組長的學校帳號，選組別。沒設定的人一律是「班級導師」。
4. 到「資料匯入」匯入會前賽成績、來賓名單。

---

## 費用與用量
- 使用 Firebase 免費方案（Spark）。每天免費額度約讀取 5 萬次、寫入 2 萬次，預估運動會當天在額度內。
- 家長看直播走 YouTube／Facebook，不占資料庫額度。
- 若擔心當天超量：專案升級為「Blaze 依用量付費」並設定預算提醒（例如 100 元），超過前會寄信通知。

## 穩定性設計（給接手的人了解）
- 每一筆資料（每個比賽組別、每則播報、每位來賓）各自一份文件，多人同時操作不會互相覆蓋。
- 斷線時操作先存在本機，恢復連線後自動補送；畫面左下顯示「傳送延遲」與「未送出筆數」，離線時頂端出現紅色提示。
- 每台裝置每 30 秒回報一次，總控台可看到各組裝置是否在線。
- 權限雙重把關：畫面上鎖按鈕＋雲端 `firestore.rules` 再檢查一次。

## 交接清單
1. Firebase 專案「成員」加入新負責人（專案設定 → 使用者和權限）。
2. GitHub repo 加入新負責人為協作者，或轉移 repo。
3. 修改 `config.js` 的 `ADMIN_EMAILS`，和 `firestore.rules` 裡 `isAdmin()` 的帳號（兩處要一致），重新上傳／發布規則。
4. 每年活動前：「積分與設定」修改活動名稱、日期、班級數、流程表；匯入新名單。
