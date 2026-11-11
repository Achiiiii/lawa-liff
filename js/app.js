/* 拉娃 LAWA LIFF — 路由、畫面渲染、互動 */
(function (LAWA) {
  'use strict';

  const C = window.LAWA_CONFIG;
  const U = LAWA.utils;
  const api = LAWA.api;
  const session = LAWA.session;

  const MAIN_PAGES = ['announcements', 'measurements', 'medications'];
  const PENDING_LINE_LOGIN_KEY = 'lawa.pendingLineLogin';
  const MED_CYCLE = ['pending', 'due', 'taken', 'missed']; // 白 → 黃 → 綠 → 紅 → 白
  const MED_STATUS_TEXT = {
    pending: '尚未到服藥時間',
    due: '該吃藥了',
    taken: '已服藥',
    missed: '超過時間未服藥',
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    screens: {
      welcome: $('screen-welcome'),
      login: $('screen-login'),
      main: $('screen-main'),
    },
    header: $('main-header'),
    userName: $('user-name'),
    tabs: $('tabs'),
    backRow: $('back-row'),
    toolbarNews: $('toolbar-news'),
    toolbarDate: $('toolbar-date'),
    searchForm: $('search-form'),
    searchInput: $('search-input'),
    sortLabel: $('sort-label'),
    datePrev: document.querySelector('.date-pill--prev'),
    dateNext: document.querySelector('.date-pill--next'),
    datePrevLabel: $('date-prev-label'),
    dateNextLabel: $('date-next-label'),
    dateFull: $('date-full'),
    dateLabel: $('date-label'),
    content: $('content'),
    loginForm: $('login-form'),
    loginAccount: $('login-account'),
    loginPassword: $('login-password'),
    loginError: $('login-error'),
    toast: $('toast'),
  };

  const state = {
    liffReady: false,
    deepLinkPage: null,
    user: null,
    userFetched: false,
    page: null,
    renderId: 0,
    cameFromList: false, // 從公告列表點進內頁，返回時用 history.back() 並還原捲動位置
    news: { keyword: '', sort: 'newest', scrollTop: 0, restoreScroll: false },
    dates: { measurements: U.todayISO(), medications: U.todayISO() },
    medItems: {}, // `${date}|${id}` → 後台資料
    medOverrides: {}, // `${date}|${id}` → { status, takenAt }（demo 點擊切換）
  };

  /* ==========================================================
     LIFF
     ========================================================== */
  async function initLiff() {
    if (!C.LIFF_ID || typeof window.liff === 'undefined') return;
    try {
      await liff.init({ liffId: C.LIFF_ID });
      state.liffReady = true;
    } catch (e) {
      console.warn('[LAWA] LIFF 初始化失敗，改用一般瀏覽器模式', e);
    }
  }

  /* ==========================================================
     路由
     ========================================================== */
  function parseRoute() {
    const [page = '', param] = location.hash.replace(/^#\/?/, '').split('/');
    return { page, param: param ? decodeURIComponent(param) : undefined };
  }

  function navigate(page, param) {
    const hash = `#/${page}${param ? `/${encodeURIComponent(param)}` : ''}`;
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  /** 取代目前歷史紀錄（避免返回鍵回到登入頁） */
  function redirect(page) {
    const hash = `#/${page}`;
    if (location.hash === hash) render();
    else location.replace(hash);
  }

  function render() {
    const { page, param } = parseRoute();
    const loggedIn = Boolean(session.get());

    if (!loggedIn) {
      if (page !== 'welcome' && page !== 'login') return redirect('welcome');
      return showAuth(page);
    }

    const isMain = MAIN_PAGES.includes(page) || (page === 'announcements' && param);
    if (!isMain) return redirect(state.deepLinkPage || C.DEFAULT_PAGE);
    state.deepLinkPage = null;

    if (page === 'announcements' && param) return showArticle(param);
    return showMainPage(page);
  }

  function showScreen(name) {
    Object.entries(el.screens).forEach(([key, node]) => {
      node.hidden = key !== name;
    });
  }

  /* ==========================================================
     歡迎頁、登入
     ========================================================== */
  function showAuth(page) {
    state.page = page;
    showScreen(page);
    if (page === 'login') {
      el.loginError.textContent = '';
    }
  }

  async function loginWithLine() {
    if (state.liffReady && !liff.isLoggedIn()) {
      // 在外部瀏覽器開啟時，需要先導到 LINE 登入頁，回來後在 boot() 接續完成
      U.storage.set(PENDING_LINE_LOGIN_KEY, true);
      liff.login({ redirectUri: location.href });
      return;
    }
    const idToken = state.liffReady ? liff.getIDToken() : null;
    await finishLogin(() => api.loginWithLine({ idToken }));
  }

  async function loginWithAccount(event) {
    event.preventDefault();
    const account = el.loginAccount.value.trim();
    const password = el.loginPassword.value;
    if (!account || !password) {
      el.loginError.textContent = !account ? '請輸入帳號' : '請輸入密碼';
      (!account ? el.loginAccount : el.loginPassword).focus();
      return;
    }
    el.loginError.textContent = '';
    await finishLogin(() => api.loginWithAccount({ account, password }), (msg) => {
      el.loginError.textContent = msg;
    });
  }

  async function finishLogin(doLogin, onError) {
    setAuthBusy(true);
    try {
      const res = await doLogin();
      session.set({ token: res.token, user: res.user });
      state.user = res.user;
      state.userFetched = false;
      el.loginForm.reset();
      redirect(state.deepLinkPage || C.DEFAULT_PAGE);
    } catch (e) {
      const msg = e && e.message ? e.message : '登入失敗，請再試一次';
      if (onError) onError(msg);
      else showToast(msg);
    } finally {
      setAuthBusy(false);
    }
  }

  function setAuthBusy(busy) {
    document.querySelectorAll('.screen-auth button').forEach((b) => {
      b.disabled = busy;
    });
  }

  function togglePassword(button) {
    const show = el.loginPassword.type === 'password';
    el.loginPassword.type = show ? 'text' : 'password';
    button.setAttribute('aria-label', show ? '隱藏密碼' : '顯示密碼');
    button.querySelector('use').setAttribute('href', show ? '#i-eye' : '#i-eye-off');
  }

  /* ==========================================================
     主畫面：共用 header
     ========================================================== */
  function prepareMain({ tab, toolbar, showBack }) {
    showScreen('main');
    loadUser();

    el.tabs.hidden = showBack;
    el.backRow.hidden = !showBack;
    el.tabs.querySelectorAll('.tab').forEach((t) => {
      const active = t.dataset.tab === tab;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', String(active));
    });
    el.toolbarNews.hidden = toolbar !== 'news';
    el.toolbarDate.hidden = toolbar !== 'date';
  }

  function loadUser() {
    const cached = state.user || session.get()?.user;
    el.userName.textContent = cached?.name || '';
    if (state.userFetched) return;
    state.userFetched = true;
    api
      .getMe()
      .then((user) => {
        state.user = user;
        el.userName.textContent = user.name;
        const s = session.get();
        if (s) session.set({ ...s, user });
      })
      .catch(() => {
        state.userFetched = false;
      });
  }

  /** 載入資料並渲染內容；切換頁面時會丟棄過期的回應 */
  async function loadContent(fetcher, draw, { keepScroll = false } = {}) {
    const id = ++state.renderId;
    if (!keepScroll) el.content.scrollTop = 0;
    el.content.innerHTML = loadingHTML();
    try {
      const data = await fetcher();
      if (id !== state.renderId) return;
      el.content.innerHTML = draw(data);
    } catch (e) {
      if (id !== state.renderId) return;
      if (e && e.status === 401) return redirect('welcome');
      el.content.innerHTML = errorHTML(e);
    }
    updateHeaderShadow();
  }

  function showMainPage(page) {
    state.page = page;
    if (page === 'announcements') {
      prepareMain({ tab: page, toolbar: 'news', showBack: false });
      el.searchInput.value = state.news.keyword;
      el.sortLabel.textContent = state.news.sort === 'newest' ? '最新' : '最舊';
      return loadAnnouncements();
    }

    prepareMain({ tab: page, toolbar: 'date', showBack: false });
    renderDateBar(page);
    const date = state.dates[page];
    if (page === 'measurements') {
      return loadContent(() => api.getMeasurements(date), (data) => measurementsHTML(data.records));
    }
    return loadContent(() => api.getMedications(date), (data) => medicationsHTML(data.date, data.items));
  }

  /* ==========================================================
     最新公告
     ========================================================== */
  function loadAnnouncements() {
    const { keyword, sort } = state.news;
    const restore = state.news.restoreScroll;
    state.news.restoreScroll = false;
    return loadContent(
      () => api.getAnnouncements({ keyword, sort }),
      (data) => announcementsHTML(data.items, keyword),
    ).then(() => {
      if (restore) el.content.scrollTop = state.news.scrollTop;
    });
  }

  function announcementsHTML(items, keyword) {
    if (!items.length) {
      return keyword.trim()
        ? stateHTML('i-search', `找不到「${U.escapeHtml(keyword.trim())}」相關的公告`, '請換個關鍵字再試試看')
        : stateHTML('i-news', '目前沒有公告', '');
    }
    return items
      .map(
        (a) => `
        <a class="news-card" href="#/announcements/${encodeURIComponent(a.id)}" data-news-id="${U.escapeHtml(a.id)}">
          <img src="${U.escapeHtml(a.coverUrl)}" alt="" loading="lazy" />
          <span class="news-card__date">${U.formatMMDDWeek(a.date)}</span>
          <span class="news-card__title">${U.escapeHtml(a.title)}</span>
        </a>`,
      )
      .join('');
  }

  function showArticle(id) {
    state.page = 'article';
    prepareMain({ tab: 'announcements', toolbar: null, showBack: true });
    return loadContent(
      () => api.getAnnouncement(id),
      (a) => {
        const paragraphs = String(a.content || '')
          .split(/\n\s*\n/)
          .filter((p) => p.trim())
          .map((p) => `<p>${U.escapeHtml(p.trim())}</p>`)
          .join('');
        return `
          <article>
            <h1 class="article-title">${U.escapeHtml(a.title)}</h1>
            <div class="article-date">${U.formatMMDDWeek(a.date)}</div>
            ${a.coverUrl ? `<div class="article-cover"><img src="${U.escapeHtml(a.coverUrl)}" alt="" /></div>` : ''}
            <div class="article-body">${paragraphs}</div>
          </article>`;
      },
    );
  }

  function goBack() {
    if (state.cameFromList) {
      state.cameFromList = false;
      state.news.restoreScroll = true;
      history.back();
    } else {
      navigate('announcements');
    }
  }

  /* ==========================================================
     日期列
     ========================================================== */
  function renderDateBar(page) {
    const date = state.dates[page];
    const today = U.todayISO();
    const prev = U.addDays(date, -1);
    const next = U.addDays(date, 1);

    el.datePrevLabel.textContent = U.formatMMDD(prev);
    el.dateNextLabel.textContent = U.formatMMDD(next);
    el.datePrev.setAttribute('aria-label', `前一天 ${U.formatMMDD(prev)}`);
    el.dateNext.setAttribute('aria-label', `後一天 ${U.formatMMDD(next)}`);

    const isToday = date >= today;
    el.dateNext.classList.toggle('is-hidden', isToday);
    el.dateNext.disabled = isToday;

    el.dateFull.textContent = U.formatFullDate(date);
    el.dateLabel.textContent = date === today ? '今天' : date === U.addDays(today, -1) ? '昨天' : '';
  }

  function changeDate(delta) {
    const page = state.page;
    if (!(page in state.dates)) return;
    const next = U.addDays(state.dates[page], delta);
    if (next > U.todayISO()) return;
    state.dates[page] = next;
    showMainPage(page);
  }

  /* ==========================================================
     每日生理量測
     ========================================================== */
  function measurementsHTML(records) {
    if (!records.length) return stateHTML('i-heart', '這一天沒有量測資料', '到文健站量測後，結果會顯示在這裡');

    const sorted = [...records].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));
    return sorted
      .map((r, i) => {
        const temp = r.temperature == null ? null : Number(r.temperature).toFixed(1);
        return `
        ${i ? '<hr class="divider" />' : ''}
        <section class="record" aria-label="測量時間 ${U.formatTime12(r.measuredAt)}">
          <div class="time-pill">測量時間 <span class="num">${U.formatTime12(r.measuredAt)}</span></div>
          <div class="metrics">
            ${metricHTML('收縮壓', r.systolic, 'mmHg', true)}
            ${metricHTML('舒張壓', r.diastolic, 'mmHg', true)}
            ${metricHTML('脈搏', r.pulse, '次 / 分鐘')}
            ${metricHTML('呼吸速率', r.respirationRate, '次 / 分鐘', true)}
            ${metricHTML('血氧', r.spo2, '%', true)}
            ${metricHTML('體溫', temp, '°C')}
            ${metricHTML('心律變異率', r.hrv, 'ms', true)}
            ${metricHTML('壓力指數', r.stressIndex, '分', true)}
          </div>
        </section>`;
      })
      .join('');
  }

  function metricHTML(label, value, unit, half) {
    const empty = value === null || value === undefined || value === '';
    return `
      <div class="metric${half ? ' metric--half' : ''}">
        <span class="metric__label">${label}</span>
        <span class="metric__value${empty ? ' is-empty' : ''}">${empty ? '--' : U.escapeHtml(value)}</span>
        <span class="metric__unit">${unit}</span>
      </div>`;
  }

  /* ==========================================================
     用藥提醒
     ========================================================== */
  /** 依時間判斷狀態：未到 → 白；預定後 30 分鐘內 → 黃；超過 → 紅；已服 → 綠 */
  function computeMedStatus(date, item) {
    if (item.takenAt) return 'taken';
    const today = U.todayISO();
    if (date < today) return 'missed';
    if (date > today) return 'pending';
    const diff = U.minutesNow() - U.toMinutes(item.scheduledTime);
    if (diff < 0) return 'pending';
    if (diff < C.MED_OVERDUE_MINUTES) return 'due';
    return 'missed';
  }

  function medView(date, item) {
    const key = `${date}|${item.id}`;
    const override = state.medOverrides[key];
    const status = override ? override.status : computeMedStatus(date, item);
    const takenAt = override ? override.takenAt : item.takenAt;
    const time = status === 'taken' && takenAt ? takenAt : item.scheduledTime;
    return { key, status, time };
  }

  function medicationsHTML(date, items) {
    if (!items.length) return stateHTML('i-pill', '這一天沒有用藥提醒', '');
    const sorted = [...items].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    sorted.forEach((item) => {
      state.medItems[`${date}|${item.id}`] = item;
    });
    return `<div class="med-list">${sorted.map((item) => medCardHTML(date, item)).join('')}</div>`;
  }

  const MED_ICONS = { pending: 'i-bell', due: 'i-bell', taken: 'i-check', missed: 'i-warning' };

  function medLabel(item, view) {
    return `${item.name}，${U.formatTime12(view.time)}，${MED_STATUS_TEXT[view.status]}`;
  }

  function medCardHTML(date, item) {
    const view = medView(date, item);
    return `
      <button type="button" class="med med--${view.status}" data-med-key="${U.escapeHtml(view.key)}" aria-label="${U.escapeHtml(medLabel(item, view))}">
        <span class="med__inner">
          <span class="med__side">
            <svg class="med__icon" aria-hidden="true"><use href="#${MED_ICONS[view.status]}"/></svg>
            <span class="med__time">${U.formatTime12(view.time)}</span>
          </span>
          <span class="med__name">${U.escapeHtml(item.name)}</span>
        </span>
      </button>`;
  }

  /** 直接更新既有卡片（保留焦點，不整張重建） */
  function updateMedCard(button) {
    const key = button.dataset.medKey;
    const item = state.medItems[key];
    if (!item) return;
    const view = medView(key.split('|')[0], item);
    button.className = `med med--${view.status}`;
    button.setAttribute('aria-label', medLabel(item, view));
    button.querySelector('.med__icon use').setAttribute('href', `#${MED_ICONS[view.status]}`);
    button.querySelector('.med__time').textContent = U.formatTime12(view.time);
  }

  /** Demo：點擊卡片依 白 → 黃 → 綠 → 紅 → 白 切換（只改畫面，不送後台） */
  function cycleMed(button) {
    const key = button.dataset.medKey;
    const item = state.medItems[key];
    if (!item) return;
    const { status } = medView(key.split('|')[0], item);
    const next = MED_CYCLE[(MED_CYCLE.indexOf(status) + 1) % MED_CYCLE.length];
    state.medOverrides[key] = {
      status: next,
      takenAt: next === 'taken' ? item.takenAt || U.nowHHMM() : null,
    };
    updateMedCard(button);
  }

  /** 停留在「今天的用藥」時，每分鐘依時間重新判斷顏色 */
  function refreshTodayMeds() {
    if (state.page !== 'medications' || state.dates.medications !== U.todayISO()) return;
    el.content.querySelectorAll('[data-med-key]').forEach((btn) => {
      if (!state.medOverrides[btn.dataset.medKey]) updateMedCard(btn);
    });
  }

  /* ==========================================================
     狀態畫面、提示
     ========================================================== */
  function loadingHTML() {
    return '<div class="state" role="status" aria-label="載入中"><div class="spinner"></div></div>';
  }

  function stateHTML(icon, title, desc) {
    return `
      <div class="state">
        <svg class="state__icon" aria-hidden="true"><use href="#${icon}"/></svg>
        <p class="state__title">${title}</p>
        ${desc ? `<p class="state__desc">${desc}</p>` : ''}
      </div>`;
  }

  function errorHTML(e) {
    const msg = e && e.status === 404 ? U.escapeHtml(e.message) : '資料載入失敗';
    return `
      <div class="state">
        <svg class="state__icon" aria-hidden="true"><use href="#i-cloud-off"/></svg>
        <p class="state__title">${msg}</p>
        <p class="state__desc">請確認網路連線後再試一次</p>
        <button type="button" class="state__btn" data-action="retry">重新整理</button>
      </div>`;
  }

  let toastTimer;
  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('is-show'), 2200);
  }

  function updateHeaderShadow() {
    el.header.classList.toggle('is-scrolled', el.content.scrollTop > 4);
  }

  /* ==========================================================
     事件
     ========================================================== */
  function bindEvents() {
    window.addEventListener('hashchange', render);

    document.addEventListener('click', (event) => {
      const actionEl = event.target.closest('[data-action]');
      if (actionEl) {
        switch (actionEl.dataset.action) {
          case 'line-login':
            return loginWithLine();
          case 'go-login':
            return navigate('login');
          case 'toggle-password':
            return togglePassword(actionEl);
          case 'forgot-password':
            return showToast('此功能尚未開放');
          case 'toggle-sort':
            state.news.sort = state.news.sort === 'newest' ? 'oldest' : 'newest';
            el.sortLabel.textContent = state.news.sort === 'newest' ? '最新' : '最舊';
            return loadAnnouncements();
          case 'date-prev':
            return changeDate(-1);
          case 'date-next':
            return changeDate(1);
          case 'back':
            return goBack();
          case 'retry':
            return render();
          default:
            return undefined;
        }
      }

      const newsCard = event.target.closest('[data-news-id]');
      if (newsCard) {
        state.cameFromList = true;
        state.news.scrollTop = el.content.scrollTop;
        return undefined;
      }

      const medCard = event.target.closest('[data-med-key]');
      if (medCard) cycleMed(medCard);
      return undefined;
    });

    el.loginForm.addEventListener('submit', loginWithAccount);

    // 搜尋：輸入停頓 0.4 秒或按下搜尋鍵就查詢
    const runSearch = () => {
      const kw = el.searchInput.value;
      if (kw === state.news.keyword) return;
      state.news.keyword = kw;
      loadAnnouncements();
    };
    el.searchInput.addEventListener('input', U.debounce(runSearch, 400));
    el.searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      el.searchInput.blur();
      runSearch();
    });

    el.content.addEventListener('scroll', updateHeaderShadow, { passive: true });

    setInterval(refreshTodayMeds, 60 * 1000);
  }

  /* ==========================================================
     啟動
     ========================================================== */
  async function boot() {
    const params = new URLSearchParams(location.search);
    if (params.has('logout')) {
      // demo 用：網址加 ?logout=1 可登出並回到歡迎頁
      session.clear();
      params.delete('logout');
      const query = params.toString();
      history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
    }
    const page = params.get('page');
    if (MAIN_PAGES.includes(page)) state.deepLinkPage = page;

    bindEvents();
    await initLiff();

    // 外部瀏覽器 LINE 登入後導回，接續完成登入
    if (state.liffReady && liff.isLoggedIn() && U.storage.get(PENDING_LINE_LOGIN_KEY)) {
      U.storage.remove(PENDING_LINE_LOGIN_KEY);
      await loginWithLine();
      return;
    }

    if (session.get() && state.deepLinkPage) return redirect(state.deepLinkPage);
    render();
  }

  boot();
})((window.LAWA = window.LAWA || {}));
