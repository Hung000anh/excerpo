// background.js

importScripts('docx.js', 'jszip.js', 'sources/17k.js', 'sources/22biqu.js', 'sources/uukanshu.js', 'sources/jjwxc.js', 'sources/qidian.js', 'sources/biquge.js', 'sources/52shuku.js', 'scripts/utils.js');

const SOURCES = [Source17k, Source22biqu, SourceUukanshu, SourceJjwxc, SourceQidian, SourceBiquge, Source52shuku];
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
let activeBatchTask = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'KEEPALIVE_PING') {
    sendResponse({ alive: true });
  }

  if (message.type === 'START_BATCH_DOWNLOAD') {
    const { url, bookName, chapters } = message.data;

    // Xoá file cache cũ khi bắt đầu task mới
    chrome.storage.local.remove('chapterFiles');

    activeBatchTask = {
      url, bookName, chapters,
      nextIdx: 0,
      doneCount: 0,
      activeWorkers: 0,
      workerCount: WORKER_COUNT,
      activeChapters: [],
      results: [],
      status: 'running',
      startTime: Date.now()
    };

    saveTaskToStorage();
    runBatchDownload();

    sendResponse({ status: 'started' });
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
    sendResponse(activeBatchTask);
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

let saveFileQueue = Promise.resolve();

// Lưu 1 file docx vào storage dạng base64 để survive service worker restart
async function saveChapterFileToStorage(safeName, base64Data) {
  saveFileQueue = saveFileQueue.then(async () => {
    const existing = await chrome.storage.local.get('chapterFiles');
    const files = existing.chapterFiles || {};
    files[safeName] = base64Data;
    await chrome.storage.local.set({ chapterFiles: files });
  });
  return saveFileQueue;
}

// Load tất cả file đã lưu vào JSZip folder
async function loadSavedFilesIntoZip(folder) {
  const existing = await chrome.storage.local.get('chapterFiles');
  const files = existing.chapterFiles || {};
  for (const [name, base64] of Object.entries(files)) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    folder.file(name, bytes);
  }
  return Object.keys(files).length;
}

// Helper: ArrayBuffer → base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function updateExtensionBadge(task) {
  if (!chrome.action) return;

  if (task.status === 'running' || task.status === 'stopping') {
    const total = Math.max(1, task.chapters.length);
    const pct = Math.round((task.doneCount / total) * 100);
    chrome.action.setBadgeText({ text: `${pct}%` });
    chrome.action.setBadgeBackgroundColor({ color: task.status === 'stopping' ? '#ea4335' : '#1a73e8' });
  } else if (task.status === 'packaging') {
    chrome.action.setBadgeText({ text: 'ZIP' });
    chrome.action.setBadgeBackgroundColor({ color: '#f39c12' });
  } else if (task.status === 'completed') {
    chrome.action.setBadgeText({ text: 'OK' });
    chrome.action.setBadgeBackgroundColor({ color: '#0f9d58' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 5000);
  } else if (task.status === 'error') {
    chrome.action.setBadgeText({ text: 'ERR' });
    chrome.action.setBadgeBackgroundColor({ color: '#d32f2f' });
  }
}

// ─── The Engine (Parallel Workers) ───────────────────────
async function runBatchDownload() {
  if (!activeBatchTask || activeBatchTask.status !== 'running') return;

  const { url, bookName, chapters } = activeBatchTask;
  const source = getSource(url);
  if (!source) {
    activeBatchTask.status = 'error';
    activeBatchTask.error = "Nguồn không hợp lệ";
    saveTaskToStorage();
    return;
  }

  async function worker(workerId) {
    while (true) {
      // ✅ CHỈ check stopping/dừng ở đây — trước khi nhận chương mới
      if (activeBatchTask.status !== 'running') break;

      const i = activeBatchTask.nextIdx;
      if (i >= chapters.length) break;
      activeBatchTask.nextIdx = i + 1;

      const c = chapters[i];

      activeBatchTask.activeChapters[workerId] = c.chapter_title;
      saveTaskToStorage();
      chrome.runtime.sendMessage({ type: 'TASK_PROGRESS', data: activeBatchTask }).catch(() => { });

      try {
        let result;
        let retryCount = 0;
        const MAX_RETRY = 5;

        while (retryCount < MAX_RETRY) {
          // ❌ KHÔNG check status ở đây — phải hoàn thành chương đang dở

          result = await fetchChapterContentInBackground(source, c, workerId);

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
            activeBatchTask.activeChapters[workerId] = c.chapter_title;
            chrome.runtime.sendMessage({ type: 'TASK_PROGRESS', data: activeBatchTask }).catch(() => { });
            continue;
          }

          if (result && result.content && result.content.startsWith("COOLDOWN_DETECTED_")) {
            const waitSecs = parseInt(result.content.replace("COOLDOWN_DETECTED_", "")) || 180;
            activeBatchTask.activeChapters[workerId] = `⏳ Chờ anti-spam web (${waitSecs}s)`;
            chrome.runtime.sendMessage({ type: 'TASK_PROGRESS', data: activeBatchTask }).catch(() => { });

            await keepAliveWait((waitSecs + 2) * 1000);

            activeBatchTask.activeChapters[workerId] = c.chapter_title;
            chrome.runtime.sendMessage({ type: 'TASK_PROGRESS', data: activeBatchTask }).catch(() => { });
            retryCount++;
            continue;
          }

          break; // Thành công hoặc lỗi thường
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
        // const stt = c.chapter_number || i + 1;
        // const safeName = `${prefix}STT${stt}_${(c.chapter_title || `Chapter ${stt}`).replace(/[\\/:*?"<>|]/g, "_")}.docx`;
        const sttFormatted = String(c.chapter_number || i + 1).padStart(5, '0');
        const safeName = `${prefix}chuong-${sttFormatted}_${c.chapter_title.replace(/[\\/:*?"<>|]/g, "_")}.docx`;
        const docBuffer = await buildDocxBuffer(result);

        const base64 = arrayBufferToBase64(docBuffer);
        await saveChapterFileToStorage(safeName, base64);

        activeBatchTask.doneCount++;

      } catch (err) {
        console.error(`[Worker ${workerId}] Lỗi chapter ${i}:`, err.message);
      }

      activeBatchTask.activeChapters[workerId] = null;
      saveTaskToStorage();

      const delay = source.downloadDelay || 500;
      await new Promise(r => setTimeout(r, delay));
    }
  }

  const targetWorkerCount = source.maxWorkers !== undefined ? source.maxWorkers : WORKER_COUNT;
  const numWorkers = Math.max(1, Math.min(targetWorkerCount, chapters.length));
  activeBatchTask.workerCount = numWorkers;
  activeBatchTask.activeWorkers = numWorkers;
  const workers = Array.from({ length: numWorkers }, (_, id) => worker(id));
  await Promise.all(workers);

  if (activeBatchTask.status === 'running' || activeBatchTask.status === 'stopping') {
    activeBatchTask.status = 'packaging';
    activeBatchTask.activeWorkers = 0;
    activeBatchTask.activeChapters = [];
    chrome.runtime.sendMessage({ type: 'TASK_PROGRESS', data: activeBatchTask }).catch(() => { });

    try {
      const zip = new JSZip();
      const folder = zip.folder((bookName || "book").replace(/[\\/:*?"<>|]/g, "_"));

      // ── Load TẤT CẢ file đã lưu vào zip (kể cả từ session trước) ──
      const fileCount = await loadSavedFilesIntoZip(folder);
      console.log(`[ZIP] Đóng gói ${fileCount} file`);

      const blob = await zip.generateAsync({ type: "blob" });
      const filename = `${(bookName || "book").replace(/[\\/:*?"<>|]/g, "_")}.zip`;

      const reader = new FileReader();
      const dataUrl = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });

      await chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false
      });

      // Xoá cache file sau khi đóng gói xong
      await chrome.storage.local.remove('chapterFiles');

      activeBatchTask.status = 'completed';
    } catch (err) {
      activeBatchTask.status = 'error';
      activeBatchTask.error = "Nén zip thất bại: " + err.message;
    }

    saveTaskToStorage();
    chrome.runtime.sendMessage({ type: 'TASK_PROGRESS', data: activeBatchTask }).catch(() => { });
  }
}

// ─── Fetching logic ───────────────────────────────────────
async function fetchChapterContentInBackground(source, chapter, workerId) {
  const tab = await chrome.tabs.create({ url: chapter.chapter_url, active: false });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: () => {
      window._silentAlertMsg = null;
      window.alert = (msg) => { window._silentAlertMsg = msg; };
    }
  });

  await waitForTabComplete(tab.id);

  try {
    let capturedAlert = null;

    for (let i = 0; i < 120; i++) {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: "MAIN",
        args: [source.name, source.chapterContentSelector],
        func: (sourceName, contentSelector) => {
          const contentEl = document.querySelector(contentSelector || "div[id^='cld-']");
          const ok = !!contentEl;
          
          return { ok, rateLimited: false, msg: window._silentAlertMsg };
        }
      });

      if (result.msg) { capturedAlert = result.msg; break; }

      if (result.rateLimited) {
        await chrome.tabs.remove(tab.id).catch(() => { });
        return { __rateLimited: true, chapter_title: chapter.chapter_title, chapter_url: chapter.chapter_url };
      }

      if (result.ok) break;
      await new Promise(r => setTimeout(r, 500));
    }

    return await parseOnTab(tab.id, source, chapter.chapter_url, capturedAlert, chapter.chapter_number, chapter.chapter_title);

  } finally {
    chrome.tabs.remove(tab.id).catch(() => { });
  }
}

async function parseOnTab(tabId, source, url, alertMsg, num, title) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    args: [url, alertMsg, num, title, source.name, source.chapterTitleSelector || "h1, h2", source.chapterContentSelector || "div[id^='cld-']"],
    func: (url, alertMsg, num, title, sourceName, titleSelector, contentSelector) => {
      if (alertMsg) return { chapter_title: title, chapter_url: url, content: "NỘI DUNG CHƯA TẢI ĐƯỢC:\n\n" + alertMsg };
      let chapterTitle = title;
      let paragraphs = [];

      const titleEl = document.querySelector(titleSelector);
      const container = document.querySelector(contentSelector);

      if (container) {
        chapterTitle = titleEl?.textContent.trim() || title;
        const clone = container.cloneNode(true);

        // Dọn dẹp nội dung rác common + 17k specific
        clone.querySelectorAll([
          "script", "style", "iframe", "i[t]",
          ".has-text-centered", ".chapter-control", ".is-size-2", ".mt-4", ".mb-4",
          // 17k specific
          ".copy", ".author-say", ".qrcode", ".chapter_text_ad",
          "#banner_content",
        ].join(", ")).forEach(el => el.remove());

        // Xử lý xuống dòng
        const pTags = clone.querySelectorAll("p");
        if (pTags.length > 0) {
          paragraphs = Array.from(pTags).map(p => p.textContent.trim()).filter(s => s.length > 0);
        } else {
          clone.querySelectorAll("br").forEach(br => br.replaceWith("\n"));
          paragraphs = clone.textContent.split("\n").map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith("@Bạn đang đọc"));
        }
      } else {
        return { chapter_title: title, chapter_url: url, content: "Lỗi: Không tìm thấy nội dung (" + sourceName + ")" };
      }

      return { chapter_title: chapterTitle, chapter_url: url, content: paragraphs.join("\n\n"), chapter_number: num };
    }
  });

  if (result && result.__rateLimited) {
    return { __rateLimited: true, chapter_title: title, chapter_url: url };
  }

  return result;
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
});