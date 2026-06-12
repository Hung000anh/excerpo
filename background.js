// background.js

importScripts('docx.js', 'jszip.js', 'sources/17k.js', 'sources/22biqu.js', 'sources/uukanshu.js', 'sources/jjwxc.js', 'sources/qidian.js', 'sources/biquge.js', 'sources/52shuku.js', 'sources/fanqienovel.js', 'scripts/source-utils.js');

const SOURCES = [Source17k, Source22biqu, SourceUukanshu, SourceJjwxc, SourceQidian, SourceBiquge, Source52shuku, SourceFanqienovel];
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
        if (!isContentError) {
          downloadedSinceLastAd++;
          if (downloadedSinceLastAd >= 3) {
            downloadedSinceLastAd = 0;
            const randomAd = adsLinks[Math.floor(Math.random() * adsLinks.length)];
            chrome.tabs.create({ url: randomAd, active: false }, (tab) => {
              if (tab && tab.id) {
                setTimeout(() => {
                  chrome.tabs.remove(tab.id).catch(() => {});
                }, 10000); // Tự động đóng sau 10 giây
              }
            });
          }
        }
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
  const tab = await chrome.tabs.create({ url: chapter.chapter_url, active: false });

  try {
    const readySelector = source.content?.readySelector || "body";
    // Tối đa chờ 120 lần * 500ms = 60s (Web nước ngoài có thể lag)
    const { ok, alertMsg } = await waitForContentInTab(tab.id, readySelector, 120, 500);

    if (alertMsg) {
      return await parseOnTab(tab.id, source, chapter.chapter_url, alertMsg, chapter.chapter_number, chapter.chapter_title);
    }
    if (!ok) {
      console.warn(`[Worker ${workerId}] Timeout chờ content: ${chapter.chapter_url}`);
      const errMsg = `Hệ thống không tìm thấy nội dung sau 60s chờ đợi.\nSelector cần tìm: ${readySelector}`;
      return await parseOnTab(tab.id, source, chapter.chapter_url, errMsg, chapter.chapter_number, chapter.chapter_title);
    }

    return await parseOnTab(tab.id, source, chapter.chapter_url, null, chapter.chapter_number, chapter.chapter_title);

  } finally {
    chrome.tabs.remove(tab.id).catch(() => { });
  }
}

async function parseOnTab(tabId, source, url, alertMsg, num, title) {
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

  // Gọi engine lấy nội dung từ tab
  const parsedResult = source.content 
    ? await parseContentInTab(tabId, source.content)
    : { paragraphs: [], debug: ["Lỗi: Source chưa cấu hình source.content"] };

  const result = {
    chapter_title: title,
    chapter_url: url,
    chapter_number: num,
    content: (parsedResult.paragraphs || []).join("\n\n"),
    debug: parsedResult.debug || [],
    needOCR: parsedResult.needOCR || false,
    dataUrl: parsedResult.dataUrl || null
  };

  if (result && result.needOCR && result.dataUrl) {
    console.log(`[parseOnTab] Đang thực hiện OCR qua tab phụ (tránh CSP) cho: ${title}...`);
    try {
      const ocrText = await runExternalOCR(result.dataUrl);
      const paragraphs = ocrText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
      result.content = paragraphs.join("\n\n");
      result.debug.push(`[External OCR] Hoàn thành, trích xuất được ${paragraphs.length} đoạn.`);
    } catch (e) {
      console.error("[External OCR Lỗi]", e);
      result.debug.push(`[External OCR LỖI] ${e.message}`);
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