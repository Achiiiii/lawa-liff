/* 假資料：後台完成前 demo 用。依日期用固定 seed 產生，同一天每次結果都一樣。 */
(function (LAWA) {
  'use strict';

  const U = LAWA.utils;
  const SAMPLE_IMAGE = 'assets/images/img-sample-01.svg';

  /** 由字串產生固定亂數序列 */
  function seeded(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function next() {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };
  }
  const randInt = (rand, min, max) => min + Math.floor(rand() * (max - min + 1));

  /* ---------- 使用者（長輩） ---------- */
  const me = { id: 'demo-001', name: '王美玲' };

  /* ---------- 最新公告 ---------- */
  const ANNOUNCEMENTS = [
    {
      id: 'a001',
      daysAgo: 0,
      title: '文健站本週活動預告',
      content: [
        '本週文健站安排了健康操、傳統歌謠歡唱及手作編織課程，歡迎長輩們一起來參加。',
        '每天上午 9 點開始量測血壓與體溫，量測完成後再進行團體活動。請記得攜帶水壺，並穿著方便活動的衣服。',
        '如有身體不適，請先告知站內照顧服務員，我們會協助安排休息。',
      ],
    },
    {
      id: 'a002',
      daysAgo: 1,
      title: '秋冬季節保健小叮嚀，早晚溫差大請注意保暖',
      content: [
        '健康是生活中最重要的事，平時應養成良好的生活習慣，保持均衡飲食、適度運動及充足睡眠，並定期關心自己的身體狀況。',
        '隨著季節變化，請留意天氣及溫度變化，適時增減衣物，並記得補充足夠水分。若身體出現不適，建議及早尋求專業醫療人員協助。',
        '讓我們從日常生活中的小細節開始，一起建立健康、安心的生活環境！',
      ],
    },
    {
      id: 'a003',
      daysAgo: 4,
      title: '免費流感疫苗接種通知',
      content: [
        '今年度公費流感疫苗開始接種，65 歲以上長輩可免費施打。',
        '衛生所人員將於下週三上午到文健站提供接種服務，請攜帶健保卡，並於前一天告知站內工作人員登記。',
        '接種後請在現場休息 30 分鐘，若有發燒或不舒服的情形，請立即告訴工作人員。',
      ],
    },
    {
      id: 'a004',
      daysAgo: 8,
      title: '部落傳統編織課程開課',
      content: [
        '傳統編織課程即將開課，由部落老師帶領大家認識傳統紋樣與織布技巧。',
        '課程每週二、四下午上課，材料由文健站提供，名額有限，請向工作人員報名。',
      ],
    },
    {
      id: 'a005',
      daysAgo: 15,
      title: '健康量測服務時間調整',
      content: [
        '自下週一起，每日健康量測時間調整為上午 9 點至 11 點。',
        '請長輩們在量測前先休息 5 分鐘，避免剛走路或爬樓梯後立即量測，讓數值更準確。',
      ],
    },
    {
      id: 'a006',
      daysAgo: 30,
      title: '長者用藥安全講座',
      content: [
        '本月特別邀請藥師到文健站分享用藥安全知識，內容包括正確服藥時間、藥物保存方式，以及多重用藥需要注意的地方。',
        '歡迎長輩帶著平常服用的藥袋到現場，藥師可以協助解答疑問。',
      ],
    },
  ];

  function announcements() {
    const today = U.todayISO();
    return ANNOUNCEMENTS.map((a) => ({
      id: a.id,
      title: a.title,
      date: U.addDays(today, -a.daysAgo),
      coverUrl: SAMPLE_IMAGE,
      content: a.content.join('\n\n'),
    }));
  }

  /* ---------- 每日生理量測 ---------- */
  const MEASURE_SLOTS = ['09:00', '12:00', '16:30'];

  function measurements(date) {
    const today = U.todayISO();
    if (date > today) return [];

    const rand = seeded(`measure-${date}`);
    // 約 2 成的日子沒有量測，用來展示空狀態
    const count = rand() < 0.2 ? 0 : randInt(rand, 1, 2);
    let slots = MEASURE_SLOTS.slice(0, count);
    // 今天只顯示已經過去的時段
    if (date === today) slots = slots.filter((t) => U.toMinutes(t) <= U.minutesNow());

    return slots.map((t) => ({
      id: `${date}-${t}`,
      measuredAt: t,
      systolic: randInt(rand, 112, 142),
      diastolic: randInt(rand, 68, 88),
      pulse: randInt(rand, 64, 92),
      respirationRate: randInt(rand, 14, 24),
      spo2: randInt(rand, 92, 99),
      temperature: Math.round((36 + rand() * 1.1) * 10) / 10,
      hrv: randInt(rand, 25, 60),
      stressIndex: randInt(rand, 15, 60),
    }));
  }

  /* ---------- 用藥提醒 ---------- */
  const MED_SCHEDULE = [
    { id: 'med-1', name: '高血壓藥', time: '08:00' },
    { id: 'med-2', name: '心臟科藥', time: '12:30' },
    { id: 'med-3', name: '心血管藥', time: '13:00' },
    { id: 'med-4', name: '睡前藥', time: '20:00' },
  ];

  function medications(date) {
    const today = U.todayISO();
    if (date > today) return [];

    const rand = seeded(`med-${date}`);
    const nowMin = U.minutesNow();

    return MED_SCHEDULE.map((m) => {
      const scheduled = U.toMinutes(m.time);
      const takenMin = scheduled + randInt(rand, 0, 25);
      const isTaken = rand() > 0.2;
      let takenAt = null;

      if (date < today) {
        // 過去的日子：約 8 成有吃
        if (isTaken) takenAt = U.fromMinutes(takenMin);
      } else if (m.id === 'med-1' && takenMin <= nowMin) {
        // 今天：只有第一個時段已服藥，其他依目前時間自動判斷顏色
        takenAt = U.fromMinutes(takenMin);
      }

      return { id: m.id, name: m.name, scheduledTime: m.time, takenAt };
    });
  }

  LAWA.mock = { me, announcements, measurements, medications };
})((window.LAWA = window.LAWA || {}));
