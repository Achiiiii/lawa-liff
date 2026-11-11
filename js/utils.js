/* 共用工具：日期、時間格式、HTML escape */
(function (LAWA) {
  'use strict';

  const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
  const pad = (n) => String(n).padStart(2, '0');

  /** Date → 'YYYY-MM-DD'（本地時間） */
  function toISODate(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  /** 'YYYY-MM-DD' → Date（本地時間 00:00） */
  function parseISODate(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function todayISO() {
    return toISODate(new Date());
  }

  /** 'YYYY-MM-DD' 加減天數 */
  function addDays(iso, days) {
    const d = parseISODate(iso);
    d.setDate(d.getDate() + days);
    return toISODate(d);
  }

  /** '2026-09-30' → '09/30' */
  function formatMMDD(iso) {
    const d = parseISODate(iso);
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
  }

  /** '2026-09-30' → '09/30 (二)' */
  function formatMMDDWeek(iso) {
    return `${formatMMDD(iso)} (${WEEKDAYS[parseISODate(iso).getDay()]})`;
  }

  /** '2026-09-30' → '2026/09/30 (二)' */
  function formatFullDate(iso) {
    const d = parseISODate(iso);
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} (${WEEKDAYS[d.getDay()]})`;
  }

  /** 'HH:mm' → 分鐘數 */
  function toMinutes(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  /** 分鐘數 → 'HH:mm' */
  function fromMinutes(total) {
    const t = ((total % 1440) + 1440) % 1440;
    return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
  }

  function nowHHMM() {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function minutesNow() {
    return toMinutes(nowHHMM());
  }

  /** '13:05' → '01:05 PM' */
  function formatTime12(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const suffix = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${pad(h12)}:${pad(m)} ${suffix}`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  /** localStorage 包一層，私密模式或被封鎖時不會壞掉 */
  const storage = {
    get(key) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        /* 無法儲存時忽略 */
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        /* 忽略 */
      }
    },
  };

  LAWA.utils = {
    toISODate,
    parseISODate,
    todayISO,
    addDays,
    formatMMDD,
    formatMMDDWeek,
    formatFullDate,
    toMinutes,
    fromMinutes,
    nowHHMM,
    minutesNow,
    formatTime12,
    escapeHtml,
    debounce,
    storage,
  };
})((window.LAWA = window.LAWA || {}));
