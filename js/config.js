/* 拉娃 LAWA LIFF — 環境設定 */
window.LAWA_CONFIG = {
  // LINE Developers 建立 LIFF App 後填入。空字串 = 不啟用 LIFF（直接在瀏覽器 demo）
  LIFF_ID: '',

  // 後台 API 網址，例如 'https://api.example.com/v1'（USE_MOCK=false 時才會使用）
  API_BASE_URL: '',

  // true = 使用 js/mock-data.js 的假資料，不呼叫後台
  USE_MOCK: true,

  // 假資料模擬的網路延遲（毫秒）
  MOCK_DELAY_MS: 300,

  // 超過預定服藥時間幾分鐘仍未服藥，就顯示紅色警示
  MED_OVERDUE_MINUTES: 30,

  // 登入後預設頁面：announcements | measurements | medications
  DEFAULT_PAGE: 'announcements',
};
