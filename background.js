// background.js

importScripts(
  'docx.js',
  'jszip.js',
  // 🇨🇳 Trung Quốc (Giản thể)
  'sources/17k.js',
  'sources/22biqu.js',
  'sources/uukanshu.js',
  'sources/jjwxc.js',
  'sources/qidian.js',
  'sources/biquge.js',
  'sources/52shuku.js',
  'sources/fanqienovel.js',
  'sources/69shuba.js',
  'sources/novel543.js',
  'sources/ixdzs8.js',
  'sources/bookqq.js',
  'sources/hetushu.js',
  'sources/xbanxia.js',
  'sources/69shumi.js',
  'sources/xbiquge.js',
  'sources/23qb.js',
  'sources/shubaow.js',
  'sources/powanjuan.js',
  'sources/shuhaige.js',
  // 🇹🇼 Đài Loan (Phồn thể)
  'sources/po18.js',
  'sources/sto55.js',
  'sources/sto9.js',
  'sources/twkan.js',
  'sources/ttkan.js',
  // 🇯🇵 Nhật Bản
  'sources/kakuyomu.js',
  'sources/syosetu.js',
  'sources/syosetu_org.js',
  'sources/pixiv.js',
  // 🌍 Âu Mỹ / Toàn cầu
  'sources/royalroad.js',
  'sources/scribblehub.js',
  'sources/ao3.js',
  'sources/novellunar.js',
  'sources/fictionpress.js',
  'sources/foxaholic.js',
  'sources/lnmtl.js',
  'sources/freewebnovel.js',
  'sources/cardboardtranslation.js',
  'sources/noveldex.js',
  'sources/novelight.js',
  // 🇹🇷 Thổ Nhĩ Kỳ
  'sources/fenrirscans.js',
  // 🇷🇺 Nga
  'sources/ranobelib.js',
  // 🇧🇷 Brazil
  'sources/centralnovel.js',
  'sources/phoenixnovels.js',
  // 🇮🇩 Indonesia
  'sources/ihuaben.js',
  'sources/meionovel.js',
  'sources/novelgo.js',
  'sources/wbnovel.js',
  // 🇫🇷 Pháp
  'sources/chireads.js',
  // Utils
  'scripts/source-utils.js',
);

const SOURCES = [
  // 🇨🇳 Trung Quốc (Giản thể)
  Source17k,
  Source22biqu,
  SourceUukanshu,
  SourceJjwxc,
  SourceQidian,
  SourceBiquge,
  Source52shuku,
  SourceFanqienovel,
  Source69shuba,
  SourceNovel543,
  SourceIxdzs8,
  SourceBookQQ,
  SourceHetushu,
  SourceXbanxia,
  Source69shumi,
  SourceXbiquge,
  Source23qb,
  SourceShubaow,
  SourcePowanjuan,
  SourceShuhaige,
  // 🇹🇼 Đài Loan (Phồn thể)
  SourcePo18,
  SourceSto55,
  SourceSto9,
  SourceTwkan,
  SourceTtkan,
  // 🇯🇵 Nhật Bản
  SourceKakuyomu,
  SourceSyosetu,
  SourceSyosetuOrg,
  SourcePixiv,
  // 🌍 Âu Mỹ / Toàn cầu
  SourceRoyalRoad,
  SourceScribbleHub,
  SourceAo3,
  SourceNovelLunar,
  SourceFictionPress,
  SourceFoxaholic,
  SourceLnmtl,
  SourceFreewebnovel,
  SourceCardboardtranslation,
  SourceNoveldex,
  SourceNovelight,
  // 🇹🇷 Thổ Nhĩ Kỳ
  SourceFenrirScans,
  // 🇷🇺 Nga
  SourceRanobelib,
  // 🇧🇷 Brazil
  SourceCentralNovel,
  SourcePhoenixNovels,
  // 🇮🇩 Indonesia
  SourceIhuaben,
  SourceMeionovel,
  SourceNovelgo,
  SourceWbnovel,
  // 🇫🇷 Pháp
  SourceChireads,
];
function getSource(url) {
  return SOURCES.find(s => s.pattern.test(url)) || null;
}

// ─── KeepAlive Sleep (tránh service worker bị Chrome suspend) ────────────────
async function keepAliveWait(ms) {
  const CHUNK = 20000; // ping mỗi 20s
  let remaining = ms;
  while (remaining > 0) {
    const wait = Math.min(CHUNK, remaining);
    await new Promise(r => setTimeout(r, wait));
    remaining -= wait;
    // Gửi ping để Chrome biết service worker vẫn còn việc làm
    chrome.runtime.sendMessage({ type: 'KEEPALIVE_PING' }).catch(() => { });
  }
}

// ─── Config ───────────────────────────────────────────────
const WORKER_COUNT = 3;

// ─── Task State ──────────────────────────────────────────
// ── QUẢN LÝ QUẢNG CÁO ──
let downloadedSinceLastAd = 0;
const adsLinks = [
  "https://omg10.com/4/10735701", "https://omg10.com/4/10659204", "https://omg10.com/4/10738319", "https://omg10.com/4/10735617",
  "https://omg10.com/4/10735521", "https://omg10.com/4/10738329", "https://omg10.com/4/10738329", "https://omg10.com/4/10738449",
  "https://omg10.com/4/10643504", "https://omg10.com/4/10738341", "https://omg10.com/4/10739756", "https://omg10.com/4/10643607",
  "https://omg10.com/4/10735467", "https://omg10.com/4/10735657", "https://omg10.com/4/10735481", "https://omg10.com/4/10738394",
  "https://omg10.com/4/10735670", "https://omg10.com/4/10738423", "https://omg10.com/4/10735494", "https://omg10.com/4/10643590",
  "https://omg10.com/4/10738345"
];

let activeBatchTask = null;
let storageInitResolve;
let storageInitPromise = new Promise(r => storageInitResolve = r);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'KEEPALIVE_PING') {
    sendResponse({ alive: true });
  }

  if (message.type === 'ADD_TO_BATCH_DOWNLOAD') {
    const { chapters } = message.data;

    let isNewTask = false;
    if (!activeBatchTask || (activeBatchTask.status !== 'running' && activeBatchTask.status !== 'stopping')) {
      activeBatchTask = {
        chapters: [],
        queue: [],
        nextIdx: 0,
        doneCount: 0,
        activeWorkers: 0,
        workerCount: WORKER_COUNT,
        activeChapters: [],
        results: [],
        status: 'running',
        startTime: Date.now()
      };
      isNewTask = true;
    }

    activeBatchTask.chapters.push(...chapters);

    // Update queue logic
    const bookGroups = {};
    chapters.forEach(c => {
      if (!bookGroups[c.bookUrl]) {
        bookGroups[c.bookUrl] = { bookUrl: c.bookUrl, bookName: c.bookName, count: 0 };
      }
      bookGroups[c.bookUrl].count++;
    });

    Object.values(bookGroups).forEach(bg => {
      const existingBook = activeBatchTask.queue.find(q => q.bookUrl === bg.bookUrl);
      if (existingBook && existingBook.status !== 'cancelled') {
        existingBook.total += bg.count;
        if (existingBook.status === 'completed') existingBook.status = 'pending';
      } else {
        activeBatchTask.queue.push({
          bookUrl: bg.bookUrl,
          bookName: bg.bookName,
          total: bg.count,
          done: 0,
          status: 'pending'
        });
      }
    });

    if (isNewTask) {
      runBatchDownload();
    }

    saveTaskToStorage();
    chrome.runtime.sendMessage({ type: 'TASK_PROGRESS', data: activeBatchTask }).catch(() => { });
    sendResponse({ status: 'started' });

    // Open ad tab after responding (popup may already be closed by now)
    if (message.data.openAd) {
      setTimeout(() => {
        const randomAd = adsLinks[Math.floor(Math.random() * adsLinks.length)];
        chrome.tabs.create({ url: randomAd, active: true }, (tab) => {
          if (tab && tab.id) {
            setTimeout(() => {
              chrome.tabs.remove(tab.id).catch(() => { });
            }, 60000);
          }
        });
      }, 1000);
    }
  }

  if (message.type === 'CANCEL_BOOK') {
    const { bookUrl } = message;
    if (activeBatchTask && activeBatchTask.status === 'running') {
      // Remove all un-processed chapters of this book
      // We only filter from nextIdx onwards so we don't mess up current loop index
      const newChapters = [];
      for (let i = 0; i < activeBatchTask.chapters.length; i++) {
        if (i < activeBatchTask.nextIdx || activeBatchTask.chapters[i].bookUrl !== bookUrl) {
          newChapters.push(activeBatchTask.chapters[i]);
        }
      }
      activeBatchTask.chapters = newChapters;

      const q = activeBatchTask.queue.find(q => q.bookUrl === bookUrl);
      if (q) {
        q.status = 'cancelled';
        setTimeout(() => {
          if (activeBatchTask && activeBatchTask.queue) {
            activeBatchTask.queue = activeBatchTask.queue.filter(item => item.bookUrl !== bookUrl);
            saveTaskToStorage();
            chrome.runtime.sendMessage({ type: 'TASK_PROGRESS', data: activeBatchTask }).catch(() => { });
          }
        }, 3000);
      }
      saveTaskToStorage();
      chrome.runtime.sendMessage({ type: 'TASK_PROGRESS', data: activeBatchTask }).catch(() => { });
    }
    sendResponse({ status: 'cancelled' });
  }

  if (message.type === 'STOP_BATCH_DOWNLOAD') {
    if (activeBatchTask && activeBatchTask.status === 'running') {
      activeBatchTask.status = 'stopping';
      saveTaskToStorage();
      chrome.runtime.sendMessage({ type: 'TASK_PROGRESS', data: activeBatchTask }).catch(() => { });
      sendResponse({ status: 'stopping' });
    } else {
      sendResponse({ status: 'ignored' });
    }
  }

  if (message.type === 'GET_TASK_STATUS') {
    storageInitPromise.then(() => {
      sendResponse(activeBatchTask);
    });
    return true; // Keep message channel open for async response
  }

  return true;
});

// ─── Persistence ─────────────────────────────────────────
async function saveTaskToStorage() {
  if (activeBatchTask) {
    // Không lưu activeChapters vào storage (chỉ cần trong memory)
    const taskToSave = { ...activeBatchTask, activeChapters: [] };
    await chrome.storage.local.set({ activeBatchTask: taskToSave });
    updateExtensionBadge(activeBatchTask);
  }
}



function updateExtensionBadge(task) {
  if (!chrome.action) return;

  if (task.status === 'running' || task.status === 'stopping') {
    const total = Math.max(1, task.chapters.length);
    const pct = Math.round((task.doneCount / total) * 100);
    chrome.action.setBadgeText({ text: `${pct}%` });
    chrome.action.setBadgeBackgroundColor({ color: task.status === 'stopping' ? '#ea4335' : '#1a73e8' });
  } else if (task.status === 'completed' || task.status === 'stopped') {
    chrome.action.setBadgeText({ text: task.status === 'stopped' ? 'STOP' : 'OK' });
    chrome.action.setBadgeBackgroundColor({ color: task.status === 'stopped' ? '#f4b400' : '#0f9d58' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 5000);
  } else if (task.status === 'error') {
    chrome.action.setBadgeText({ text: 'ERR' });
    chrome.action.setBadgeBackgroundColor({ color: '#d32f2f' });
  }
}

// ─── The Engine (Parallel Workers) ───────────────────────
async function runBatchDownload() {
  if (!activeBatchTask || activeBatchTask.status !== 'running') return;

  const { chapters } = activeBatchTask;

  async function worker(workerId) {
    while (true) {
      // ✅ CHỈ check stopping/dừng ở đây — trước khi nhận chương mới
      if (activeBatchTask.status !== 'running') break;

      const i = activeBatchTask.nextIdx;
      if (i >= chapters.length) break;
      activeBatchTask.nextIdx = i + 1;

      const c = activeBatchTask.chapters[i];
      if (!c) {
        // Just in case it was filtered out
        continue;
      }

      const q = activeBatchTask.queue.find(q => q.bookUrl === c.bookUrl);
      if (q && q.status === 'pending') {
        q.status = 'running';
        chrome.runtime.sendMessage({ type: 'TASK_PROGRESS', data: activeBatchTask }).catch(() => { });
      }

      const chapterSource = getSource(c.bookUrl);
      if (!chapterSource) {
        console.error(`[Worker ${workerId}] Nguồn không hợp lệ cho ${c.bookUrl}`);
        activeBatchTask.activeChapters[workerId] = null;
        saveTaskToStorage();
        continue;
      }

      const chapterDisplayTitle = `${c.bookName} - ${c.chapter_title}`;
      activeBatchTask.activeChapters[workerId] = chapterDisplayTitle;
      saveTaskToStorage();
      chrome.runtime.sendMessage({ type: 'TASK_PROGRESS', data: activeBatchTask }).catch(() => { });

      console.log(`[Worker ${workerId}] Bắt đầu tải chương: ${chapterDisplayTitle} (${c.chapter_url})`);

      try {
        let result;
        let retryCount = 0;
        const MAX_RETRY = 5;

        while (retryCount < MAX_RETRY) {
          // ❌ KHÔNG check status ở đây — phải hoàn thành chương đang dở

          result = await fetchChapterContentInBackground(chapterSource, c, workerId);

          if (result && result.__rateLimited) {
            const waitSecs = 60;
            retryCount++;
            console.warn(`[Worker ${workerId}] Rate-limited "${c.chapter_title}", chờ ${waitSecs}s... (${retryCount}/${MAX_RETRY})`);

            activeBatchTask.activeChapters[workerId] = `⏸ Rate-limit, chờ ${waitSecs}s (${retryCount}/${MAX_RETRY}): ${c.chapter_title}`;
            activeBatchTask.rateLimitRetry = {
              chapterIdx: i,
              retryCount,
              until: Date.now() + waitSecs * 1000
            };
            saveTaskToStorage();
            chrome.runtime.sendMessage({ type: 'TASK_PROGRESS', data: activeBatchTask }).catch(() => { });

            await keepAliveWait(waitSecs * 1000);

            activeBatchTask.rateLimitRetry = null;
            activeBatchTask.activeChapters[workerId] = chapterDisplayTitle;
            chrome.runtime.sendMessage({ type: 'TASK_PROGRESS', data: activeBatchTask }).catch(() => { });
            continue;
          }

          if (result && result.content && result.content.startsWith("COOLDOWN_DETECTED_")) {
            const waitSecs = parseInt(result.content.replace("COOLDOWN_DETECTED_", "")) || 180;
            activeBatchTask.activeChapters[workerId] = `⏳ Chờ anti-spam web (${waitSecs}s)`;
            chrome.runtime.sendMessage({ type: 'TASK_PROGRESS', data: activeBatchTask }).catch(() => { });

            await keepAliveWait((waitSecs + 2) * 1000);

            activeBatchTask.activeChapters[workerId] = chapterDisplayTitle;
            chrome.runtime.sendMessage({ type: 'TASK_PROGRESS', data: activeBatchTask }).catch(() => { });
            retryCount++;
            continue;
          }

          const isContentError = !result || !result.content ||
            result.content.includes("NỘI DUNG CHƯA TẢI ĐƯỢC") ||
            result.content.includes("Hệ thống không tìm thấy nội dung") ||
            result.content.includes("Lỗi tải nội dung") ||
            result.content.includes("Lỗi:") ||
            result.content.length < 100;

          if (isContentError) {
            retryCount++;
            if (retryCount < MAX_RETRY) {
              console.warn(`[Worker ${workerId}] Lỗi nội dung "${c.chapter_title}", thử lại (${retryCount}/${MAX_RETRY})`);

              activeBatchTask.activeChapters[workerId] = `⏳ Lỗi nội dung, thử lại (${retryCount}/${MAX_RETRY}): ${c.chapter_title}`;
              saveTaskToStorage();
              chrome.runtime.sendMessage({ type: 'TASK_PROGRESS', data: activeBatchTask }).catch(() => { });

              await keepAliveWait(5000);

              activeBatchTask.activeChapters[workerId] = chapterDisplayTitle;
              chrome.runtime.sendMessage({ type: 'TASK_PROGRESS', data: activeBatchTask }).catch(() => { });
              continue;
            }
          } else {
            break; // Thành công, thoát vòng lặp
          }
        }

        // ❌ ĐÃ XÓA: if (activeBatchTask.status !== 'running') break;

        // Hết retry vẫn rate-limited → ghi lỗi, tiếp tục
        if (result && result.__rateLimited) {
          result = {
            chapter_title: c.chapter_title,
            chapter_url: c.chapter_url,
            content: `LỖI: Bị rate-limit sau ${MAX_RETRY} lần thử - ${c.chapter_url}`
          };
        }

        const isContentError = !result || !result.content ||
          result.content.includes("NỘI DUNG CHƯA TẢI ĐƯỢC") ||
          result.content.includes("Hệ thống không tìm thấy nội dung") ||
          result.content.includes("Lỗi tải nội dung") ||
          result.content.includes("Lỗi:") ||
          result.content.length < 100;

        const prefix = isContentError ? "ERROR_" : "";
        const format = c.format || 'docx';
        const stt = c.chapter_number || i + 1;
        const nameFmt = c.nameFormat || "#{index}_{title}";
        const safeTitle = c.chapter_title.replace(/[\\/:*?"<>|]/g, "_");
        const baseName = nameFmt.replace(/\{index\}/g, stt).replace(/\{title\}/g, safeTitle).replace(/[\\/:*?"<>|]/g, "_");
        const safeName = `${prefix}${baseName}.${format}`;

        let blob;
        if (format === 'txt') {
          const txtContent = `${result.chapter_title || "Chapter"}\n\n${result.content || ""}`;
          blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
        } else if (format === 'epub') {
          const epubBuffer = await buildEpubBuffer(result);
          blob = new Blob([epubBuffer], { type: 'application/epub+zip' });
        } else {
          const docBuffer = await buildDocxBuffer(result);
          blob = new Blob([docBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        }
        const reader = new FileReader();
        const dataUrl = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });

        const baseFolder = c.folderName || "Excerpo";
        const bookSubFolder = (c.bookName || "Truyen").replace(/[\\/:*?"<>|]/g, "_");
        const action = c.conflictAction || 'uniquify';

        await chrome.downloads.download({
          url: dataUrl,
          filename: `${baseFolder}/${bookSubFolder}/${safeName}`,
          conflictAction: action,
          saveAs: false
        });

        // Xử lý mở quảng cáo sau mỗi 3 chương thành công
        // Automatic ad trigger removed. Ads will be shown via user request.
        console.log(`[Worker ${workerId}] Đã tải xong: ${chapterDisplayTitle}`);
      } catch (err) {
        console.error(`[Worker ${workerId}] Lỗi tải chương:`, err);
      }

      activeBatchTask.doneCount++;
      const cBook = activeBatchTask.chapters[i];
      if (cBook) {
        const qUpdate = activeBatchTask.queue.find(q => q.bookUrl === cBook.bookUrl);
        if (qUpdate && qUpdate.status !== 'cancelled') {
          qUpdate.done++;
          if (qUpdate.done >= qUpdate.total) {
            qUpdate.status = 'completed';
            const completedBookUrl = cBook.bookUrl;
            setTimeout(() => {
              if (activeBatchTask && activeBatchTask.queue) {
                activeBatchTask.queue = activeBatchTask.queue.filter(q => q.bookUrl !== completedBookUrl);
                saveTaskToStorage();
                chrome.runtime.sendMessage({ type: 'TASK_PROGRESS', data: activeBatchTask }).catch(() => { });
              }
            }, 3000);
          }
        }
      }

      activeBatchTask.activeChapters[workerId] = null;
      saveTaskToStorage();

      const storage = await chrome.storage.local.get("chapterDelay");
      const userDelay = (storage.chapterDelay !== undefined ? storage.chapterDelay : 60) * 1000;
      const delay = Math.max(chapterSource ? (chapterSource.downloadDelay || 500) : 500, userDelay);
      if (delay > 0) {
        await keepAliveWait(delay);
      }
    }
  }

  const storage = await chrome.storage.local.get("chapterDelay");
  const userDelay = (storage.chapterDelay !== undefined ? storage.chapterDelay : 60) * 1000;
  const targetWorkerCount = (userDelay > 0) ? 1 : WORKER_COUNT;
  const numWorkers = Math.max(1, Math.min(targetWorkerCount, activeBatchTask.chapters.length));
  activeBatchTask.workerCount = numWorkers;
  activeBatchTask.activeWorkers = numWorkers;
  const workers = Array.from({ length: numWorkers }, (_, id) => worker(id));
  await Promise.all(workers);

  if (activeBatchTask.status === 'running' || activeBatchTask.status === 'stopping') {
    activeBatchTask.status = activeBatchTask.status === 'stopping' ? 'stopped' : 'completed';
    activeBatchTask.activeWorkers = 0;
    activeBatchTask.activeChapters = [];

    saveTaskToStorage();
    chrome.runtime.sendMessage({ type: 'TASK_PROGRESS', data: activeBatchTask }).catch(() => { });
  }
}

// ─── Fetching logic ───────────────────────────────────────
async function fetchChapterContentInBackground(source, chapter, workerId) {
  const shouldBeActive = chapter.type === 'vip';
  const tab = await chrome.tabs.create({ url: chapter.chapter_url, active: shouldBeActive });

  try {
    const contentConfig = typeof source.content === 'function' ? source.content(chapter) : source.content;
    const readySelector = contentConfig?.readySelector || "body";
    // Tối đa chờ 120 lần * 500ms = 60s (Web nước ngoài có thể lag)
    const { ok, alertMsg } = await waitForContentInTab(tab.id, readySelector, 120, 500);

    // Chờ thêm 5 giây riêng cho chương VIP để web xử lý xong giải mã / xác thực
    if (shouldBeActive && ok && !alertMsg) {
      await new Promise(r => setTimeout(r, 5000));
    }

    if (alertMsg) {
      return await parseOnTab(tab.id, source, chapter, alertMsg);
    }
    if (!ok) {
      console.warn(`[Worker ${workerId}] Timeout chờ content: ${chapter.chapter_url}`);
      const errMsg = `Hệ thống không tìm thấy nội dung sau 60s chờ đợi.\nSelector cần tìm: ${readySelector}`;
      return await parseOnTab(tab.id, source, chapter, errMsg);
    }

    return await parseOnTab(tab.id, source, chapter, null);

  } finally {
    chrome.tabs.remove(tab.id).catch(() => { });
  }
}

async function parseOnTab(tabId, source, chapter, alertMsg) {
  const { chapter_title: title, chapter_url: url, chapter_number: num } = chapter;
  console.log(`[parseOnTab] Đang tiến hành bóc tách nội dung chương: ${title} (${url})`);

  if (alertMsg) {
    return {
      chapter_title: title,
      chapter_url: url,
      chapter_number: num,
      content: "NỘI DUNG CHƯA TẢI ĐƯỢC:\n\n" + alertMsg,
      debug: []
    };
  }

  const contentConfig = typeof source.content === 'function' ? source.content(chapter) : source.content;

  // Gọi engine lấy nội dung từ tab
  const parsedResult = contentConfig
    ? await parseContentInTab(tabId, contentConfig)
    : { paragraphs: [], debug: ["Lỗi: Source chưa cấu hình source.content"] };

  const result = {
    chapter_title: title,
    chapter_url: url,
    chapter_number: num,
    content: (parsedResult.paragraphs || []).join("\n\n"),
    debug: parsedResult.debug || [],
    needOCR: parsedResult.needOCR || false,
    dataUrls: parsedResult.dataUrls || null
  };

  if (result && result.needOCR) {
    if (parsedResult.dataUrl) {
      // Chế độ cũ: Chụp toàn bộ trang làm 1 ảnh lớn
      console.log(`[parseOnTab] Đang thực hiện OCR toàn trang qua tab phụ (tránh CSP) cho: ${title}...`);
      try {
        const ocrText = await runExternalOCR(parsedResult.dataUrl);
        // Xử lý xuống dòng thông minh: 
        const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const paragraphs = [];
        let currentPara = "";

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          currentPara += line;

          const lastChar = line.slice(-1);
          const terminalPunctuation = /['"”’。！？.!?…~>\]】]/;

          if (line.length < 35 || terminalPunctuation.test(lastChar) || i === lines.length - 1) {
            paragraphs.push(currentPara);
            currentPara = "";
          }
        }

        result.content = paragraphs.join("\n\n");
        result.debug.push(`[External OCR] Hoàn thành OCR toàn trang, trích xuất được ${paragraphs.length} đoạn.`);
      } catch (e) {
        console.error("[External OCR Lỗi]", e);
        result.debug.push(`[External OCR LỖI] ${e.message}`);
      }
    } else if (result.dataUrls && result.dataUrls.length > 0) {
      // Chế độ mới: OCR song song từng đoạn văn (5 workers)
      console.log(`[parseOnTab] Đang thực hiện OCR song song cho ${result.dataUrls.length} ảnh thẻ p của: ${title}...`);
      try {
        let completedCount = 0;
        const totalCount = result.dataUrls.length;

        const ocrPromises = result.dataUrls.map(async (dataUrl, idx) => {
          try {
            // if (idx < 3) {
            //   console.log(`[BASE64 IMAGE - Đoạn ${idx} - ${title}] Mở trong tab mới để xem ảnh:\n`, dataUrl);
            // }
            const ocrText = await runExternalOCR(dataUrl);
            // Mỗi thẻ p là một dòng văn bản. Xóa bỏ tất cả các ký tự xuống dòng thừa bên trong OCR của thẻ p đó
            const cleanedText = ocrText.replace(/\r?\n/g, '').trim();
            completedCount++;
            if (completedCount % 10 === 0 || completedCount === totalCount) {
              console.log(`[OCR Tiến trình - ${title}] Đã nhận diện xong: ${completedCount}/${totalCount} thẻ p...`);
            }
            return cleanedText;
          } catch (e) {
            console.error(`[OCR Lỗi thẻ p #${idx} trong chương ${title}]`, e);
            return `[LỖI OCR thẻ p #${idx}: ${e.message}]`;
          }
        });

        const paragraphs = await Promise.all(ocrPromises);
        result.content = paragraphs.filter(Boolean).join("\n\n");
        result.debug.push(`[External OCR] Hoàn thành, trích xuất song song được ${paragraphs.length} đoạn.`);
      } catch (e) {
        console.error("[External OCR Lỗi]", e);
        result.debug.push(`[External OCR LỖI] ${e.message}`);
      }
    }
  }

  // ← Log ra Service Worker console
  if (result?.debug) {
    console.log(`[parseOnTab] Kết quả xử lý: ${title}`);
    result.debug.forEach(l => {
      if (l.startsWith("DATA_URL: ")) {
        console.log(`[OCR_IMAGE_URL - ${title}]`, l.replace("DATA_URL: ", ""));
      } else {
        console.log('  >', l);
      }
    });
  } else {
    console.log(`[parseOnTab] Không nhận được kết quả hợp lệ cho ${title}`, result);
  }

  if (result && result.__rateLimited) {
    return { __rateLimited: true, chapter_title: title, chapter_url: url };
  }

  return result;
}

// ─── Offscreen Document Setup ──────────────────────────────
async function setupOffscreenDocument() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: 'ocr.html',
    reasons: ['WORKERS'],
    justification: 'Thực thi OCR ngầm trên ảnh do CSP chặn',
  });
}

// Tự động khởi tạo Offscreen Document khi Service Worker khởi động (để pre-warm workers và hiển thị inspect view)
setupOffscreenDocument().catch(e => console.error("[Startup] Lỗi khởi tạo Offscreen Document:", e));

// ─── External OCR Helper ─────────────────────────────────
async function runExternalOCR(dataUrl) {
  await setupOffscreenDocument();

  const response = await chrome.runtime.sendMessage({
    type: 'run_ocr',
    dataUrl: dataUrl
  });

  if (!response) {
    throw new Error("Mất kết nối với Offscreen Document.");
  }

  if (response.success) {
    return response.text;
  } else {
    throw new Error(response.error + "\n" + response.stack);
  }
}

// ─── Docx helper ─────────────────────────────────────────
async function buildDocxBuffer(chapter) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;

  const paragraphs = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun(chapter.chapter_title || "Chapter")]
    }),
    new Paragraph({ children: [new TextRun("")] }),
    ...(chapter.content || "").split("\n\n").map(text =>
      new Paragraph({
        children: [new TextRun({ text: text.trim(), size: 24 })],
        spacing: { after: 200 }
      })
    )
  ];

  const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
  const blob = await Packer.toBlob(doc);
  return blob.arrayBuffer();
}

// ─── Epub helper ─────────────────────────────────────────
async function buildEpubBuffer(chapter) {
  const zip = new JSZip();

  // 1. mimetype (Must be uncompressed, but writing as string works for most reader apps)
  zip.file("mimetype", "application/epub+zip");

  // 2. META-INF/container.xml
  const containerXml = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.file("META-INF/container.xml", containerXml);

  // 3. OEBPS/content.opf
  const title = chapter.chapter_title || "Chapter";
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>vi</dc:language>
    <dc:identifier id="BookID">excerpo-${Date.now()}</dc:identifier>
    <dc:creator opf:role="aut">Unknown</dc:creator>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="chapter"/>
  </spine>
</package>`;
  zip.file("OEBPS/content.opf", opf);

  // 4. OEBPS/toc.ncx
  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="excerpo-${Date.now()}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapeXml(title)}</text>
  </docTitle>
  <navMap>
    <navPoint id="navPoint-1" playOrder="1">
      <navLabel>
        <text>${escapeXml(title)}</text>
      </navLabel>
      <content src="chapter.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`;
  zip.file("OEBPS/toc.ncx", ncx);

  // 5. OEBPS/chapter.xhtml
  const contentHtml = (chapter.content || "").split("\n\n").map(text => `<p>${escapeXml(text.trim())}</p>`).join("\n");
  const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="vi">
<head>
  <title>${escapeXml(title)}</title>
</head>
<body>
  <h1>${escapeXml(title)}</h1>
  ${contentHtml}
</body>
</html>`;
  zip.file("OEBPS/chapter.xhtml", xhtml);

  return await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// ─── Restore task on startup ──────────────────────────────
chrome.storage.local.get("activeBatchTask", async (res) => {
  if (res.activeBatchTask && res.activeBatchTask.status === 'running') {
    activeBatchTask = res.activeBatchTask;
    activeBatchTask.activeChapters = [];
    activeBatchTask.activeWorkers = 0;

    // Nếu service worker bị kill đúng lúc đang chờ rate-limit,
    // tính thời gian còn lại và tiếp tục chờ, sau đó retry đúng chương đó
    if (activeBatchTask.rateLimitRetry) {
      const remaining = activeBatchTask.rateLimitRetry.until - Date.now();
      // Đưa nextIdx về chương đang bị rate-limit để retry
      activeBatchTask.nextIdx = activeBatchTask.rateLimitRetry.chapterIdx;
      activeBatchTask.rateLimitRetry = null;
      saveTaskToStorage();

      if (remaining > 0) {
        console.log(`[Restore] Tiếp tục chờ rate-limit: còn ${Math.ceil(remaining / 1000)}s`);
        // Dùng keepAliveWait để tránh bị suspend ngay sau khi restore
        await keepAliveWait(remaining);
      }
    }

    runBatchDownload();
  }
  storageInitResolve();
});