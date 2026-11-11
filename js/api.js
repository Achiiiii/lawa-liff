/*
 * API 接口與登入 session
 * USE_MOCK=true 時回傳假資料；後台完成後把 USE_MOCK 改成 false、填入 API_BASE_URL 即可。
 * 各接口的請求與回應格式見 docs/API.md
 */
(function (LAWA) {
  'use strict';

  const C = window.LAWA_CONFIG;
  const U = LAWA.utils;
  const SESSION_KEY = 'lawa.session';

  /* ---------- session ---------- */
  const session = {
    /** @returns {{token: string, user: {id: string, name: string}} | null} */
    get: () => U.storage.get(SESSION_KEY),
    set: (value) => U.storage.set(SESSION_KEY, value),
    clear: () => U.storage.remove(SESSION_KEY),
  };

  class ApiError extends Error {
    constructor(status, message) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  }

  /* ---------- 真實 API ---------- */
  async function request(method, path, { query, body } = {}) {
    const url = new URL(C.API_BASE_URL.replace(/\/$/, '') + path);
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    });

    const headers = { Accept: 'application/json' };
    if (body) headers['Content-Type'] = 'application/json';
    const token = session.get()?.token;
    if (token) headers.Authorization = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch (e) {
      throw new ApiError(0, '網路連線失敗');
    }

    if (res.status === 401) {
      session.clear();
      throw new ApiError(401, '登入已過期，請重新登入');
    }
    if (!res.ok) throw new ApiError(res.status, `伺服器錯誤（${res.status}）`);
    return res.status === 204 ? null : res.json();
  }

  /* ---------- 假資料 ---------- */
  function mock(produce) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(JSON.parse(JSON.stringify(produce())));
        } catch (e) {
          reject(e);
        }
      }, C.MOCK_DELAY_MS);
    });
  }

  /* ---------- 接口 ---------- */
  const api = {
    /** LINE 登入：用 LIFF 取得的 ID Token 換取系統 token */
    loginWithLine({ idToken }) {
      if (C.USE_MOCK) return mock(() => ({ token: 'mock-line-token', user: LAWA.mock.me }));
      return request('POST', '/auth/line', { body: { idToken } });
    },

    /** 一般帳號登入 */
    loginWithAccount({ account, password }) {
      if (C.USE_MOCK) {
        return mock(() => {
          if (!account || !password) throw new ApiError(400, '請輸入帳號和密碼');
          return { token: 'mock-account-token', user: LAWA.mock.me };
        });
      }
      return request('POST', '/auth/login', { body: { account, password } });
    },

    /** 目前登入的長輩資料 */
    getMe() {
      if (C.USE_MOCK) return mock(() => LAWA.mock.me);
      return request('GET', '/me');
    },

    /** 公告列表；sort: 'newest' | 'oldest' */
    getAnnouncements({ keyword = '', sort = 'newest' } = {}) {
      if (C.USE_MOCK) {
        return mock(() => {
          const kw = keyword.trim().toLowerCase();
          const items = LAWA.mock
            .announcements()
            .filter((a) => !kw || a.title.toLowerCase().includes(kw) || a.content.toLowerCase().includes(kw))
            .sort((a, b) => (sort === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)))
            .map(({ content, ...summary }) => summary);
          return { items };
        });
      }
      return request('GET', '/announcements', { query: { keyword: keyword.trim(), sort } });
    },

    /** 單篇公告 */
    getAnnouncement(id) {
      if (C.USE_MOCK) {
        return mock(() => {
          const found = LAWA.mock.announcements().find((a) => a.id === id);
          if (!found) throw new ApiError(404, '找不到這則公告');
          return found;
        });
      }
      return request('GET', `/announcements/${encodeURIComponent(id)}`);
    },

    /** 指定日期的生理量測；date: 'YYYY-MM-DD' */
    getMeasurements(date) {
      if (C.USE_MOCK) return mock(() => ({ date, records: LAWA.mock.measurements(date) }));
      return request('GET', '/measurements', { query: { date } });
    },

    /** 指定日期的用藥提醒；date: 'YYYY-MM-DD' */
    getMedications(date) {
      if (C.USE_MOCK) return mock(() => ({ date, items: LAWA.mock.medications(date) }));
      return request('GET', '/medications', { query: { date } });
    },
  };

  LAWA.api = api;
  LAWA.session = session;
  LAWA.ApiError = ApiError;
})((window.LAWA = window.LAWA || {}));
