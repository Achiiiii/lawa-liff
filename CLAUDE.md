# 拉娃 LAWA — LINE LIFF（長輩端）

## ⚠️ Git 規則（最重要）
- **所有 git 操作都必須先取得使用者同意**：init、add、commit、push、pull、branch、merge、rebase、tag、reset 等都算。
- **未經允許，絕對不可以自動 commit 或 push。**
- 遠端 repo：`git@github.com:Achiiiii/lawa-liff.git`

## 專案概要
- 「原民健康促進管理平台」的長輩端 LINE LIFF。
- 長輩只能**查看**以下三種資料，不能在 LIFF 裡記錄：
  - 最新公告（文健站公告）
  - 每日生理量測
  - 用藥提醒
- 設計稿：Figma 檔案 `qOmlHMkFuoWisETxJmByvh`（養生村管理系統），區塊 node `883:5280`，畫面寬 390×844。
  - Figma MCP 是 Starter 方案，呼叫次數有限，要省著用。
  - 讀取時指定單一 node，不要讀整頁。
- 目前**沒有後台**：
  - 一律使用假資料（`js/mock-data.js`）。
  - API 接口寫在 `js/api.js`，規格在 `docs/API.md`。

## 技術與結構
- 純 HTML、CSS、原生 JavaScript，**不使用打包工具**。
  - 用 classic script，不用 ES module，這樣直接開 `index.html` 就能 demo。
- 全域命名空間 `window.LAWA`：`utils`、`mock`、`api`、`session`。設定放在 `window.LAWA_CONFIG`。
- 路由採 hash（`#/announcements`、`#/announcements/:id`、`#/measurements`、`#/medications`、`#/welcome`、`#/login`）。

```
index.html          單頁 APP，內含 SVG 圖示 sprite
css/style.css       設計變數放在 :root
js/config.js        LIFF_ID、API_BASE_URL、USE_MOCK 等設定
js/utils.js         日期、時間格式、HTML escape
js/mock-data.js     假資料（依日期用固定 seed 產生，每次結果相同）
js/api.js           API 接口與 session（USE_MOCK=true 時走假資料）
js/app.js           路由、畫面渲染、互動
assets/images/      Figma 匯出素材（logo、bg-circle、icon-avatar、icon-line、img-sample-01）
docs/API.md         給後台的 API 規格
```

## 設計規範
- **色彩**
  - 主色：紅 `#BC4839`、綠 `#459D51`、黃 `#F7B21C`、灰 `#EBEBEB`
  - 標題藍 `#12407A`
  - 文字：`#2A2A2A`、`#696969`、`#AAAAAA`
  - 輸入框底色 `#CCCCCC`
  - 卡片外框 = 主色 50% 透明
- **背景紋樣**：`bg-circle.svg` 透明度 20%，高度拉成和畫面一樣，左右裁掉。
  - 主畫面只露出上半部，下半部被內容遮住。
- **字型**：中文用 Noto Sans TC，數字用 Inter。
- **用藥卡片狀態**

| 狀態 | 顏色 | 判斷規則 |
|---|---|---|
| `pending` | 白 | 還沒到預定時間 |
| `due` | 黃 | 預定時間後 30 分鐘內 |
| `missed` | 紅 | 超過 30 分鐘仍未服藥 |
| `taken` | 綠 | 已服藥，顯示實際服藥時間 |

  - Demo：點擊卡片依「白 → 黃 → 綠 → 紅 → 白」循環，只改前端顯示，不送後台。

## 工作規則
- **Figma 上沒有的 UI 或功能**：可以自行設計，但必須告知使用者新增了哪些。
- 新功能先確認需求和流程，再談實作細節。
- 回覆使用繁體中文。
