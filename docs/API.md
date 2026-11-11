# 拉娃 LAWA LIFF — API 規格（草案）

前端已經依照本文件寫好接口（`js/api.js`），目前用假資料（`js/mock-data.js`）。
後台完成後，在 `js/config.js` 設定以下兩項即可改接真實 API，格式有調整時同步修改 `js/api.js`：
- `USE_MOCK: false`
- `API_BASE_URL`

## 通用規則
- **格式**：JSON，UTF-8。
- **認證**：登入後取得 `token`，之後每個請求都帶 `Authorization: Bearer <token>`。
- **token 過期或無效**：回 `401`。前端會清除登入狀態，回到歡迎頁。
- **日期**：`YYYY-MM-DD`，例如 `2026-11-11`。
- **時間**：24 小時制 `HH:mm`，例如 `13:05`。前端會自己轉成 `01:05 PM` 顯示。
- **錯誤回應**：建議格式 `{ "message": "錯誤說明" }`，並搭配適當的 HTTP 狀態碼。

---

## 1. LINE 登入
`POST /auth/line`

用 LIFF 取得的 ID Token 換取系統 token。後台需要：
1. 向 LINE 驗證 ID Token。
2. 取得 LINE userId。
3. 對應到「個案資料管理」裡已綁定的長輩。

綁定流程尚未決定。

請求：
```json
{ "idToken": "eyJhbGciOi..." }
```

回應 `200`：
```json
{
  "token": "xxxxx",
  "user": { "id": "demo-001", "name": "王美玲" }
}
```

## 2. 一般帳號登入
`POST /auth/login`

請求：
```json
{ "account": "test@gmail.com", "password": "********" }
```

回應：格式同 LINE 登入。帳號或密碼錯誤時回 `401`，並附上 `message`。

> 忘記密碼目前只有 UI，沒有接口。

## 3. 目前登入的長輩
`GET /me`

回應 `200`：
```json
{ "id": "demo-001", "name": "王美玲" }
```

`name` 會顯示在右上角，取代設計稿的「使用者名稱」。

## 4. 公告列表（文健站公告）
`GET /announcements?keyword=&sort=newest`

| 參數 | 說明 |
|---|---|
| `keyword` | 選填，搜尋標題和內文 |
| `sort` | `newest`（最新，預設）或 `oldest`（最舊），依公告日期排序 |

回應 `200`：
```json
{
  "items": [
    {
      "id": "a001",
      "title": "文健站本週活動預告",
      "date": "2026-11-11",
      "coverUrl": "https://.../cover.jpg"
    }
  ]
}
```

> 列表不需要回傳內文。目前一次回傳全部公告，資料量變大後再討論是否分頁。

## 5. 單篇公告
`GET /announcements/{id}`

回應 `200`：
```json
{
  "id": "a001",
  "title": "文健站本週活動預告",
  "date": "2026-11-11",
  "coverUrl": "https://.../cover.jpg",
  "content": "第一段文字。\n\n第二段文字。"
}
```

- `content` 是純文字，段落之間用空一行（`\n\n`）分隔。
- 找不到公告時回 `404`。

## 6. 每日生理量測
`GET /measurements?date=2026-11-11`

回應 `200`：當天沒有量測時，`records` 回空陣列。
```json
{
  "date": "2026-11-11",
  "records": [
    {
      "id": "m-001",
      "measuredAt": "09:00",
      "systolic": 128,
      "diastolic": 78,
      "pulse": 82,
      "respirationRate": 24,
      "spo2": 91,
      "temperature": 36.5,
      "hrv": 45,
      "stressIndex": 31
    }
  ]
}
```

| 欄位 | 顯示名稱 | 單位 |
|---|---|---|
| `measuredAt` | 測量時間 | HH:mm |
| `systolic` | 收縮壓 | mmHg |
| `diastolic` | 舒張壓 | mmHg |
| `pulse` | 脈搏 | 次 / 分鐘 |
| `respirationRate` | 呼吸速率 | 次 / 分鐘 |
| `spo2` | 血氧 | % |
| `temperature` | 體溫 | °C（顯示到小數 1 位） |
| `hrv` | 心律變異率 | ms |
| `stressIndex` | 壓力指數 | 分 |

- 沒有量到的項目回 `null`，前端會顯示 `--`。
- 一天有多筆時，前端會依時間由新到舊排列。

## 7. 用藥提醒
`GET /medications?date=2026-11-11`

回應 `200`：
```json
{
  "date": "2026-11-11",
  "items": [
    { "id": "med-1", "name": "高血壓藥", "scheduledTime": "08:00", "takenAt": "08:31" },
    { "id": "med-2", "name": "心臟科藥", "scheduledTime": "12:30", "takenAt": null }
  ]
}
```

| 欄位 | 說明 |
|---|---|
| `scheduledTime` | 預定服藥時間 |
| `takenAt` | 實際服藥時間（後台備註的「已用藥時間」欄位），未服藥為 `null` |

顏色由前端依時間判斷，超時的分鐘數可在 `config.js` 的 `MED_OVERDUE_MINUTES` 調整：

| 條件 | 顏色 |
|---|---|
| 有 `takenAt` | 綠（顯示實際服藥時間） |
| 還沒到預定時間 | 白 |
| 預定時間後 30 分鐘內 | 黃 |
| 超過 30 分鐘仍未服藥，或過去日期未服藥 | 紅 |

> 「已吃藥」要如何記錄還沒決定。目前 demo 點擊卡片只會在前端切換顏色，不會送到後台。
