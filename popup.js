/**
 * popup.js - Mạch nha Grabber
 * Refactored to use background script for long-running tasks.
 */

const SOURCES = [Source17k, Source22biqu, SourceUukanshu, SourceJjwxc, SourceQidian, SourceBiquge, Source52shuku];
function getSource(url) {
  return SOURCES.find(s => s.pattern.test(url)) || null;
}

// ─── UI Helpers ──────────────────────────────────────────
const dom = {
  urlInput: document.getElementById("urlInput"),
  btnSubmit: document.getElementById("btnSubmit"),
  btnClearState: document.getElementById("btnClearState"),
  result: document.getElementById("result"),
  memeImg: document.getElementById("memeImg")
};

// ─── Initialization ──────────────────────────────────────
async function init() {
  restoreState();
  startMonitoringBackground();
  setupEventListeners();
  showRandomMeme();
}

// ─── Background Sync ─────────────────────────────────────
function startMonitoringBackground() {
  // Listen for progress updates from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TASK_PROGRESS') {
      renderBackgroundProgress(message.data);
    }
  });

  // Check if there's already a task running
  chrome.runtime.sendMessage({ type: 'GET_TASK_STATUS' }, (task) => {
    if (task && task.status === 'running') {
      renderBackgroundProgress(task);
    }
  });
}

function renderBackgroundProgress(task) {
  const progressDiv = document.getElementById("downloadProgress");
  if (!progressDiv) return;

  const total = task.chapters.length;
  const done = task.doneCount || 0;
  const pct = Math.round((done / Math.max(1, total)) * 100);

  if (task.status === 'running' || task.status === 'stopping') {
    const isStopping = task.status === 'stopping';

    // Build active workers list (filter nulls)
    const activeList = (task.activeChapters || [])
      .filter(t => t)
      .map(t => `<div style="font-size:10px;color:#555;padding-left:4px;">⚙️ ${t}</div>`)
      .join('');

    progressDiv.innerHTML = `
      <div style="color:${isStopping ? '#ea4335' : '#1a73e8'};font-weight:bold;">
        ${isStopping ? '⏳ Đang chờ dừng...' : '⏳ Đang tải ngầm:'} ${done}/${total} (${task.workerCount || 1} workers)
      </div>
      <div style="margin:4px 0;">${activeList || '<div style="font-size:10px;color:#999;">Đang khởi động workers...</div>'}</div>
      ${renderProgressBar(pct)}
      <div style="font-size:10px;color:#999;margin-top:4px;">Bạn có thể đóng popup, việc tải sẽ tiếp tục.</div>
      ${isStopping ? '' : `
      <button id="btnStopDownload" style="width:100%;margin-top:8px;padding:6px;background:#ea4335;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;">
        ⏹ Dừng lấy chương & Đóng gói ngay file ZIP
      </button>
      `}
    `;

    // Disable download all button if running/stopping
    const btnAll = document.getElementById("btnDownloadAll");
    if (btnAll) {
      btnAll.disabled = true;
      btnAll.textContent = isStopping ? "⏳ Đang dừng công việc..." : "⏳ Đang chạy ngầm...";
    }

    if (!isStopping) {
      const btnStop = document.getElementById("btnStopDownload");
      if (btnStop) {
        btnStop.addEventListener("click", () => {
          btnStop.disabled = true;
          btnStop.textContent = "⏳ Đang dừng lại...";
          chrome.runtime.sendMessage({ type: 'STOP_BATCH_DOWNLOAD' });
        });
      }
    }
  } else if (task.status === 'packaging') {
    progressDiv.innerHTML = `<div>📦 Đang nén zip...</div>${renderProgressBar(99)}`;
  } else if (task.status === 'completed') {
    progressDiv.innerHTML = `
      <div style="color:#0f9d58;font-weight:bold;">✅ Hoàn tất!</div>
      <div style="font-size:10px;">Đã tải xong file ZIP.</div>
      ${renderProgressBar(100)}
    `;
    const btnAll = document.getElementById("btnDownloadAll");
    if (btnAll) {
      btnAll.disabled = false;
      btnAll.textContent = `⬇ Tải lại toàn bộ (.zip)`;
    }
  } else if (task.status === 'error') {
    progressDiv.innerHTML = `<div style="color:red;">❌ Lỗi: ${task.error}</div>`;
  }
}

// Re-implement renderProgressBar locally since utils.js is not an ESM (or we can import it if we make it one)
// But for small things, duplication is fine or we use classic script tags.
function renderProgressBar(pct) {
  return `
    <div style="height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden;margin-top:4px;">
      <div style="height:100%;width:${pct}%;background:#1a73e8;transition:width 0.3s;border-radius:3px;"></div>
    </div>`;
}

// ─── Rendering Logic ──────────────────────────────────────
function renderPreview(d, source, url, tabId, resultDiv) {
  resultDiv.innerHTML = `
    <div style="display:flex;gap:12px;margin-top:8px;">
      ${d.coverImage
      ? `<img src="${d.coverImage}" style="width:80px;height:110px;object-fit:cover;border-radius:4px;flex-shrink:0;">`
      : `<div style="width:80px;height:110px;background:#eee;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#999;">No cover</div>`
    }
      <div style="flex:1;min-width:0;">
        <b style="font-size:14px;">${d.bookName || "Không rõ tên"}</b><br>
        <span style="color:#666;font-size:12px;">✍️ ${d.authorName || "Không rõ tác giả"}</span><br>
        <span style="color:#999;font-size:11px;">ID: ${d.sourceBookCode || "?"}</span><br>
        ${d.description ? `<p style="font-size:12px;margin-top:6px;color:#444;">${d.description}...</p>` : ""}
        <a href="${d.url}" target="_blank" style="font-size:11px;">🔗 Xem trang gốc</a>
      </div>
    </div>

    <div style="margin-top:12px;border-top:1px solid #eee;padding-top:10px;">
      <button id="btnChapters" style="padding:6px 12px;background:#1a73e8;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">
        📋 Lấy danh sách chapter
      </button>
      <div id="chapterResult" style="margin-top:8px;"></div>
    </div>
  `;

  document.getElementById("btnChapters").addEventListener("click", async () => {
    const chapterDiv = document.getElementById("chapterResult");
    chapterDiv.innerHTML = `<p style="font-size:12px;color:#666;">⏳ Đang lấy danh sách chapter...</p>`;

    try {
      let chapters = [];
      if (source.fetchChapters) {
        chapters = await source.fetchChapters(url, (msg) => {
          const count = chapters.length;
          chapterDiv.innerHTML = `
            <p style="font-size:12px;color:#666;">⏳ ${msg}</p>
            <p style="font-size:11px;color:#1a73e8;margin-top:2px;">Tìm thấy: <b>${count}</b> chapters...</p>
          `;
        });
      } else {
        let currentTabId = tabId;
        if (!currentTabId) {
          const tab = await chrome.tabs.create({ url, active: false });
          await new Promise(r => {
            function listener(tid, info) { if (tid === tab.id && info.status === 'complete') { chrome.tabs.onUpdated.removeListener(listener); r(); } }
            chrome.tabs.onUpdated.addListener(listener);
          });
          currentTabId = tab.id;
        }
        chapters = await fetchChaptersFromTab(currentTabId, source);
      }

      if (!chapters.length) {
        chapterDiv.innerHTML = `<p style="color:red;font-size:12px;">❌ Không tìm thấy chapter nào</p>`;
        return;
      }

      await chrome.storage.local.set({ lastState: { url, preview: d, chapters, timestamp: Date.now() } });
      renderChapters(source, chapters, d.bookName, chapterDiv, tabId, url);
    } catch (err) {
      chapterDiv.innerHTML = `<p style="color:red;font-size:12px;">❌ Lỗi: ${err.message}</p>`;
    }
  });
}

function renderChapters(source, chapters, bookName, chapterDiv, tabId, url) {
  chapterDiv.innerHTML = `
    <p style="font-size:12px;color:#333;margin:4px 0;"><b>${chapters.length} chapters</b></p>
    <div style="max-height:300px;overflow-y:auto;border:1px solid #eee;border-radius:4px;margin-top:6px;">
      ${chapters.map((c, idx) => {
    const isVip = c.type === "vip";
    const icon = isVip ? "🔒" : c.type === "unvip" ? "🔓" : "";
    return `
          <div style="font-size:11px;padding:4px 8px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:6px;">
            <span style="color:#999;min-width:30px;">#${c.chapter_number}</span>
            <a href="${c.chapter_url}" target="_blank" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#1a73e8;">
              ${c.chapter_title}
            </a>
            <span style="width:20px;text-align:center;flex-shrink:0;">${icon}</span>
            <button data-idx="${idx}" class="btnDownload" style="padding:2px 8px;font-size:10px;background:#1a73e8;color:white;border:none;border-radius:3px;cursor:pointer;flex-shrink:0;">
              ⬇ .docx
            </button>
          </div>
        `;
  }).join('')}
    </div>
    <div style="margin-top:10px;background:#f5f5f5;padding:8px;border-radius:4px;border:1px solid #ddd;">
      <p style="font-size:11px;color:#555;margin-bottom:6px;font-weight:bold;">⚙️ Cấu hình tải hàng loạt:</p>
      <div style="display:flex;gap:10px;margin-bottom:10px;">
        <div style="flex:1;">
          <label style="font-size:10px;color:#666;display:block;">Từ chương số:</label>
          <input type="number" id="chapterFrom" style="width:100%;padding:4px;font-size:11px;border:1px solid #ccc;border-radius:3px;" value="1" min="1">
        </div>
        <div style="flex:1;">
          <label style="font-size:10px;color:#666;display:block;">Đến chương số:</label>
          <input type="number" id="chapterTo" style="width:100%;padding:4px;font-size:11px;border:1px solid #ccc;border-radius:3px;" value="${chapters.length}" min="1">
        </div>
      </div>
      <button id="btnDownloadAll" style="width:100%;padding:8px;background:#0f9d58;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">
        ⬇ Tải các chương đã chọn (.zip)
      </button>
      <div id="downloadProgress" style="margin-top:6px;font-size:11px;color:#666;min-height:16px;"></div>
    </div>
  `;

  // Download all button sends message to background
  document.getElementById("btnDownloadAll").addEventListener("click", () => {
    const btnAll = document.getElementById("btnDownloadAll");
    let fromVal = parseInt(document.getElementById("chapterFrom").value) || 1;
    let toVal = parseInt(document.getElementById("chapterTo").value) || chapters.length;

    // Ràng buộc giá trị hợp lệ
    if (fromVal < 1) fromVal = 1;
    if (toVal > chapters.length) toVal = chapters.length;
    if (fromVal > chapters.length) fromVal = chapters.length;
    if (toVal < 1) toVal = 1;

    if (fromVal > toVal) {
      alert(`⚠️ Số chương bắt đầu (${fromVal}) không thể lớn hơn số chương kết thúc (${toVal})!`);
      return;
    }

    // Cập nhật lại UI cho người dùng thấy giá trị đã được sửa
    document.getElementById("chapterFrom").value = fromVal;
    document.getElementById("chapterTo").value = toVal;

    const filteredChapters = chapters.slice(fromVal - 1, toVal);

    if (filteredChapters.length === 0) {
      alert("⚠️ Không có chương nào thỏa mãn điều kiện để tải!");
      return;
    }

    btnAll.disabled = true;
    btnAll.textContent = `⏳ Đang gửi ${filteredChapters.length} chương (từ #${fromVal} đến #${toVal})...`;

    chrome.runtime.sendMessage({
      type: 'START_BATCH_DOWNLOAD',
      data: { url, bookName, chapters: filteredChapters }
    }, (response) => {
      if (!response) {
        btnAll.disabled = false;
        btnAll.textContent = "❌ Lỗi kết nối nền";
      } else {
        btnAll.textContent = "🚀 Đã gửi! Theo dõi tiến trình bên dưới.";
      }
    });
  });

  // Individual button still works in popup (optional, but keep for convenience)
  document.querySelectorAll(".btnDownload").forEach(btn => {
    btn.addEventListener("click", async () => {
      const idx = btn.dataset.idx;
      const chapter = chapters[idx];
      btn.textContent = "...";
      btn.disabled = true;
      try {
        // Individual fetch still uses popup logic for simplicity
        const result = await fetchIndividualChapter(source, chapter);
        await downloadChapterAsDocx(result);
        btn.textContent = "✓ Xong";
      } catch (err) {
        btn.textContent = "⬇ .docx";
        alert("❌ " + err.message);
      }
      btn.disabled = false;
    });
  });
}

// ─── Fetching Logic ───────────────────────────────────────
async function fetchChaptersFromTab(tabId, source) {
  const selector = source.chapterListSelector || "#chaptercontainerinner a.listchapitem";
  let found = false;
  for (let i = 0; i < 20; i++) {
    const [{ result: count }] = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      args: [selector],
      func: (sel) => document.querySelectorAll(sel).length
    });
    if (count > 0) { found = true; break; }
    await new Promise(r => setTimeout(r, 500));
  }

  if (!found) throw new Error("Timeout: danh sách chapter chưa render");

  const [{ result: chapters }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    args: [selector, source.name],
    func: (sel, sourceName) => {
      const elements = [...document.querySelectorAll(sel)];
      return elements.map((el, i) => {
        let url = el.href;
        if (sourceName === 'sangtacviet') {
           const parent = el.parentElement;
           const urlKey = Object.keys(parent).find(k => !k.startsWith("__") && !k.startsWith("jQuery"));
           const path = urlKey ? parent[urlKey] : null;
           url = path ? `https://sangtacviet.com${path}` : null;
        }
        return {
          chapter_number: i + 1,
          chapter_title: el.textContent?.trim() || el.getAttribute("title")?.trim() || `Chương ${i + 1}`,
          chapter_url: url,
          type: el.classList.contains("vip") ? "vip" : el.classList.contains("unvip") ? "unvip" : "normal",
        };
      }).filter(c => c.chapter_url);
    }
  });

  return chapters;
}

async function fetchIndividualChapter(source, chapter) {
  const tab = await chrome.tabs.create({ url: chapter.chapter_url, active: false });
  await new Promise(r => {
    function listener(tid, info) { if (tid === tab.id && info.status === 'complete') { chrome.tabs.onUpdated.removeListener(listener); r(); } }
    chrome.tabs.onUpdated.addListener(listener);
  });

  // Chờ cho đến khi nội dung render xong (giống background.js)
  for (let i = 0; i < 30; i++) {
    const [{ result: ok }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      args: [source.name, source.chapterContentSelector],
      func: (sourceName, contentSelector) => {
        const contentEl = document.querySelector(contentSelector || "div[id^='cld-']");
        return !!contentEl;
      }
    });

    if (ok) {
      break;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      args: [chapter.chapter_url, null, chapter.chapter_number, chapter.chapter_title, source.name, source.chapterTitleSelector, source.chapterContentSelector],
      func: (url, alertMsg, num, title, sourceName, titleSelector, contentSelector) => {
        if (alertMsg) return { chapter_title: title, chapter_url: url, content: "LỖI:\n" + alertMsg };
        let chapterTitle = title;
        let paragraphs = [];

        const titleEl = document.querySelector(titleSelector || "h1, h2");
        const container = document.querySelector(contentSelector || "div[id^='cld-']");

        if (container) {
          chapterTitle = titleEl?.textContent.trim() || title;
          const clone = container.cloneNode(true);
          clone.querySelectorAll([
            "script", "style", "iframe", "i[t]",
            ".has-text-centered", ".chapter-control", ".is-size-2", ".mt-4", ".mb-4",
            ".copy", ".author-say", ".qrcode", ".chapter_text_ad",
            "#banner_content",
          ].join(", ")).forEach(el => el.remove());
          
          const pTags = clone.querySelectorAll("p");
          if (pTags.length > 0) {
            paragraphs = Array.from(pTags).map(p => p.textContent.trim()).filter(s => s.length > 0);
          } else {
            clone.querySelectorAll("br").forEach(br => br.replaceWith("\n"));
            paragraphs = clone.textContent.split("\n").map(s => s.trim()).filter(s => s.length > 0);
          }
        } else {
           return { chapter_title: title, chapter_url: url, content: "Lỗi tải nội dung" };
        }

        return { chapter_title: chapterTitle, content: paragraphs.join("\n\n"), chapter_url: url, chapter_number: num };
      }
    });
    return result;
  } finally {
    chrome.tabs.remove(tab.id);
  }
}

async function downloadChapterAsDocx(chapter) {
  // Relying on global docx from popup.html
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
  const paragraphs = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(chapter.chapter_title)] }),
    ...(chapter.content || "").split("\n\n").map(text => new Paragraph({ children: [new TextRun({ text, size: 24 })] }))
  ];
  const doc = new Document({ sections: [{ children: paragraphs }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  const isContentError = !chapter.content ||
    chapter.content.includes("NỘI DUNG CHƯA TẢI ĐƯỢC") ||
    chapter.content.includes("Hệ thống không tìm thấy nội dung") ||
    chapter.content.includes("Lỗi tải nội dung") ||
    chapter.content.includes("Lỗi:") ||
    chapter.content.length < 100;
  const prefix = isContentError ? "ERROR_" : "";

  // const stt = chapter.chapter_number;
  // a.download = `${prefix}STT${stt}_${chapter.chapter_title.replace(/[\\/:*?"<>|]/g, "_")}.docx`;
  const sttFormatted = String(chapter.chapter_number).padStart(5, '0');
  a.download = `${prefix}chuong-${sttFormatted}_${chapter.chapter_title.replace(/[\\/:*?"<>|]/g, "_")}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── State Management ─────────────────────────────────────
async function restoreState() {
  const data = await chrome.storage.local.get("lastState");
  if (!data.lastState) return;

  const { url, preview, chapters } = data.lastState;
  const source = getSource(url);
  if (!source) return;

  dom.urlInput.value = url;
  renderPreview(preview, source, url, null, dom.result);

  if (chapters && chapters.length) {
    renderChapters(source, chapters, preview.bookName, document.getElementById("chapterResult"), null, url);
  }
}

// ─── Events ──────────────────────────────────────────────
function setupEventListeners() {
  dom.btnClearState.addEventListener("click", async () => {
    await chrome.storage.local.remove("lastState");
    dom.urlInput.value = "";
    dom.result.innerHTML = "";
  });

  dom.btnSubmit.addEventListener("click", async () => {
    const url = dom.urlInput.value.trim();
    if (!url) return;

    const source = getSource(url);
    if (!source) { alert("URL không hợp lệ"); return; }

    dom.result.innerHTML = `<p>⏳ Đang mở trang...</p>`;
    const tab = await chrome.tabs.create({ url, active: false });

    // Wait for tab
    await new Promise(r => {
      function listener(tid, info) { if (tid === tab.id && info.status === 'complete') { chrome.tabs.onUpdated.removeListener(listener); r(); } }
      chrome.tabs.onUpdated.addListener(listener);
    });

    const [{ result: html }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: () => document.documentElement.outerHTML,
    });

    const d = source.parsePreview(html, url);

    // Chuyển ảnh thành base64 trong tab gốc để tránh bị chặn hiển thị (chống hotlink)
    if (d.coverImage && d.coverImage.startsWith("http")) {
      try {
        const [{ result: base64Img }] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: "MAIN",
          args: [d.coverImage],
          func: async (imgUrl) => {
            try {
              const res = await fetch(imgUrl);
              const blob = await res.blob();
              return await new Promise(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
              });
            } catch (e) { return null; }
          }
        });
        if (base64Img) d.coverImage = base64Img;
      } catch (err) {
        console.warn("Lỗi tải ảnh blob:", err);
      }
    }

    await chrome.storage.local.set({ lastState: { url, preview: d, chapters: null, timestamp: Date.now() } });
    renderPreview(d, source, url, tab.id, dom.result);
  });

  document.querySelectorAll(".example-url").forEach(el => {
    el.addEventListener("click", () => {
      dom.urlInput.value = el.dataset.url;
      dom.urlInput.focus();
    });
  });
}

function showRandomMeme() {
  // Logic remains the same
}

init();