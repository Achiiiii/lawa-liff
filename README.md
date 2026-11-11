# 拉娃 LAWA — LINE LIFF（長輩端）

長輩在 LINE 裡查看自己的「最新公告」、「每日生理量測」和「用藥提醒」。
目前還沒有後台，全部使用假資料 demo。

## 本機執行
純 HTML、CSS、JS，不需要安裝套件。

- **最簡單**：直接用瀏覽器開啟 `index.html`。
- **建議**：用本機伺服器開，行為比較接近正式環境。
  ```bash
  npx serve .
  ```
  然後開啟終端機顯示的網址。

在電腦上測試時，可以用瀏覽器開發者工具切換成手機尺寸（例如 iPhone 12 Pro，390×844）。

## Demo 小技巧
| 想做的事 | 方法 |
|---|---|
| 登入 | 歡迎頁按「使用 LINE 登入」；或按「一般帳號登入」，帳號密碼隨便填 |
| 登出、回到歡迎頁 | 網址加上 `?logout=1`，例如 `index.html?logout=1` |
| 直接開某個分頁 | 網址加上 `?page=medications`（也可以用 `measurements`、`announcements`） |
| 切換用藥卡片顏色 | 點卡片，依「白 → 黃 → 綠 → 紅 → 白」循環 |
| 看沒有量測資料的畫面 | 每日生理量測往前翻，約 2 成的日子沒有資料 |

## 設定（`js/config.js`）
| 設定 | 說明 |
|---|---|
| `LIFF_ID` | LINE Developers 建立 LIFF App 後填入；空字串表示不啟用 LIFF |
| `API_BASE_URL` | 後台 API 網址 |
| `USE_MOCK` | `true` 用假資料；後台完成後改成 `false` |
| `MED_OVERDUE_MINUTES` | 超過預定時間幾分鐘未服藥算紅色，預設 30 |
| `DEFAULT_PAGE` | 登入後預設頁面，預設 `announcements` |

## 上線到 LINE 前需要
1. LINE 官方帳號，以及 LINE Login channel。
2. 在 channel 建立 LIFF App：
   - Size 建議選 Full。
   - Scope 勾選 `openid`、`profile`。
   - Endpoint URL 填入網站網址，必須是 HTTPS。
3. 把 LIFF ID 填入 `config.js`。
4. 後台完成 `docs/API.md` 的接口後，把 `USE_MOCK` 改成 `false`。

## 檔案結構
```
index.html          單頁 APP，內含 SVG 圖示
css/style.css       樣式；設計變數在 :root
js/config.js        設定
js/utils.js         日期、時間等工具
js/mock-data.js     假資料
js/api.js           API 接口與登入狀態
js/app.js           路由、畫面、互動
assets/images/      Figma 匯出素材
docs/API.md         API 規格（給後台）
```
