/**
 * translate.js - Module tích hợp BlackStone AI Translation (Hắc Thạch Thôn)
 * Luồng: Tự động phát hiện theo folder Cài đặt -> Liệt kê tên truyện -> Dịch từ chương X tới Y -> Lưu về folder/translate/
 */

(function () {
  const DEFAULT_API_KEY = "bks_live_FudUTsCyHMa_wf3d5ynS7nZTeXfbS9J3VRj2A3jbqSU";
  const BASE_URL = "https://api.hachthachthon.site/api/v1/public";

  // Elements
  const elApiKey = document.getElementById("transApiKey");
  const btnToggleKey = document.getElementById("btnToggleApiKey");
  const btnSaveKey = document.getElementById("btnSaveApiKey");
  const elType = document.getElementById("transType");
  const elLevel = document.getElementById("transLevel");
  const elAdvanceOptions = document.getElementById("transAdvanceOptions");
  const elBookSelect = document.getElementById("transBookSelect");
  const elManualBookId = document.getElementById("transManualBookId");
  const btnRefreshBooks = document.getElementById("btnRefreshBooks");
  const btnCreateBook = document.getElementById("btnCreateBook");
  const elNovelAdvanceRow = document.getElementById("transNovelAdvanceRow");
  const elChapterNum = document.getElementById("transChapterNum");
  const elMangaAdvanceRow = document.getElementById("transMangaAdvanceRow");
  const elGenre = document.getElementById("transGenre");
  const elContext = document.getElementById("transContext");

  // Batch translate elements
  const btnGrantDirAccess = document.getElementById("btnGrantDirAccess");
  const elBookFolderSelect = document.getElementById("transBookFolderSelect");
  const elFolderNotice = document.getElementById("transFolderNotice");
  const elRangeWrap = document.getElementById("transRangeWrap");
  const elFromCh = document.getElementById("transFromCh");
  const elFromTo = document.getElementById("transFromTo");
  const elSavePathNotice = document.getElementById("transSavePathNotice");
  const btnStartBatchTrans = document.getElementById("btnStartBatchTrans");
  const btnStopBatchTrans = document.getElementById("btnStopBatchTrans");
  const elProgressWrap = document.getElementById("transProgressWrap");
  const elProgressText = document.getElementById("transProgressText");
  const elProgressPercent = document.getElementById("transProgressPercent");
  const elProgressBar = document.getElementById("transProgressBar");

  // Single translation elements
  const elTitle = document.getElementById("transTitle");
  const elContent = document.getElementById("transContent");
  const btnDoTranslate = document.getElementById("btnDoTranslate");
  const btnClearTrans = document.getElementById("btnClearTrans");
  const btnCopyResult = document.getElementById("btnCopyTransResult");
  const elResult = document.getElementById("transResult");
  const elStatusBadge = document.getElementById("transStatusBadge");

  // State
  let rootDirHandle = null;
  let bookSubDirectories = new Map(); // bookName -> dirHandle
  let currentBookFiles = [];          // list of { name, fileHandle, chapterNum }
  let isTranslatingBatch = false;
  let stopBatchRequested = false;

  // ── IndexedDB Helper để lưu trữ DirectoryHandle vĩnh viễn ──────────────────
  const DB_NAME = "ExcerpoTranslateDB";
  const STORE_NAME = "handles";

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        e.target.result.createObjectStore(STORE_NAME);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveStoredHandle(handle) {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(handle, "rootDirectory");
      return new Promise(res => { tx.oncomplete = res; });
    } catch (e) {
      console.warn("Lưu handle thất bại:", e);
    }
  }

  async function getStoredHandle() {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get("rootDirectory");
      return new Promise(res => {
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(null);
      });
    } catch (e) {
      return null;
    }
  }

  // Load Key & Settings from storage
  chrome.storage.local.get(
    [
      "blackstoneApiKey",
      "blackstoneType",
      "blackstoneLevel",
      "blackstoneBookId",
      "blackstoneBooks",
      "cachedFolder"
    ],
    async (res) => {
      elApiKey.value = res.blackstoneApiKey || DEFAULT_API_KEY;
      if (res.blackstoneType) elType.value = res.blackstoneType;
      if (res.blackstoneLevel) elLevel.value = res.blackstoneLevel;
      if (res.blackstoneBookId) elManualBookId.value = res.blackstoneBookId;

      if (res.blackstoneBooks && Array.isArray(res.blackstoneBooks)) {
        populateBookSelect(res.blackstoneBooks, res.blackstoneBookId);
      }
      updateUIState();

      // Kiểm tra xem đã có quyền truy cập thư mục gốc chưa
      const savedHandle = await getStoredHandle();
      if (savedHandle) {
        try {
          let perm = await savedHandle.queryPermission({ mode: "readwrite" });
          if (perm !== "granted") {
            // Thử query mode read
            perm = await savedHandle.queryPermission({ mode: "read" });
          }
          if (perm === "granted") {
            rootDirHandle = savedHandle;
            await scanRootDirectory();
          } else {
            // Nếu trình duyệt yêu cầu click người dùng để kích hoạt lại quyền
            elFolderNotice.innerHTML = `⚠️ Nhấn vào <b>Thư mục gốc Excerpo</b> để cấp lại quyền truy cập cho thư mục đã nhớ.`;
          }
        } catch (e) {
          elFolderNotice.textContent = "💡 Bấm nút 'Thư mục gốc Excerpo' để chọn thư mục truyện.";
        }
      } else {
        const baseFolder = res.cachedFolder || "Excerpo";
        elFolderNotice.textContent = `💡 Bạn chỉ cần chọn thư mục "${baseFolder}" 1 lần duy nhất, Extension sẽ tự động ghi nhớ vĩnh viễn.`;
      }
    }
  );

  // Button cấp lại quyền thư mục gốc Excerpo đã nhớ
  btnGrantDirAccess.addEventListener("click", async () => {
    try {
      // Nếu đã có savedHandle thì thử requestPermission trước để người dùng không cần phải duyệt lại file picker
      const handle = rootDirHandle || (await getStoredHandle());
      if (handle) {
        try {
          const status = await handle.requestPermission({ mode: "readwrite" });
          if (status === "granted") {
            rootDirHandle = handle;
            await scanRootDirectory();
            return;
          }
        } catch (e) {
          // Fallback to showDirectoryPicker
        }
      }

      const newHandle = await window.showDirectoryPicker({
        mode: "readwrite",
        startIn: "downloads"
      });
      if (newHandle) {
        rootDirHandle = newHandle;
        await saveStoredHandle(newHandle);
        showBadge("Đã liên kết thư mục!", "#27ae60");
        await scanRootDirectory();
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error(err);
        alert("Không thể chọn thư mục: " + err.message);
      }
    }
  });

  // Button chọn một thư mục bất kỳ khác trên máy
  const btnChangeDir = document.getElementById("btnChangeDir");
  if (btnChangeDir) {
    btnChangeDir.addEventListener("click", async () => {
      try {
        const handle = await window.showDirectoryPicker({
          mode: "readwrite"
        });
        if (handle) {
          rootDirHandle = handle;
          await saveStoredHandle(handle);
          showBadge(`Đã chuyển sang: ${handle.name}`, "#27ae60");
          await scanRootDirectory();
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error(err);
          alert("Không thể chọn thư mục: " + err.message);
        }
      }
    });
  }

  // Quét danh sách các folder truyện trong thư mục được chọn
  async function scanRootDirectory() {
    if (!rootDirHandle) return;

    bookSubDirectories.clear();
    elBookFolderSelect.innerHTML = `<option value="">-- Chọn bộ truyện trong máy --</option>`;

    try {
      let directFiles = [];

      for await (const entry of rootDirHandle.values()) {
        if (entry.kind === "directory" && entry.name !== "translate") {
          bookSubDirectories.set(entry.name, entry);
          const opt = document.createElement("option");
          opt.value = entry.name;
          opt.textContent = `📁 ${entry.name}`;
          elBookFolderSelect.appendChild(opt);
        } else if (entry.kind === "file") {
          const lower = entry.name.toLowerCase();
          if (lower.endsWith(".txt") || lower.endsWith(".docx") || lower.endsWith(".raw") || lower.endsWith(".json")) {
            directFiles.push(entry);
          }
        }
      }

      // TRƯỜNG HỢP 1: Người dùng chọn thẳng vào folder của 1 bộ truyện cụ thể (chứa trực tiếp các file chương)
      if (directFiles.length > 0) {
        bookSubDirectories.set(rootDirHandle.name, rootDirHandle);
        const opt = document.createElement("option");
        opt.value = rootDirHandle.name;
        opt.textContent = `📖 [Hiện tại] ${rootDirHandle.name} (${directFiles.length} chương)`;
        opt.selected = true;
        elBookFolderSelect.appendChild(opt);

        elFolderNotice.textContent = `✅ Đã nhận diện bộ truyện "${rootDirHandle.name}" (${directFiles.length} file).`;
        showBadge(`Đã nhận diện truyện!`, "#27ae60");

        // Kích hoạt tự động hiển thị dải chương
        elBookFolderSelect.dispatchEvent(new Event("change"));
        return;
      }

      // TRƯỜNG HỢP 2: Người dùng chọn folder Excerpo (chứa các folder con của từng truyện)
      const count = bookSubDirectories.size;
      if (count > 0) {
        elFolderNotice.textContent = `✅ Đã tìm thấy ${count} bộ truyện trong "${rootDirHandle.name}". Hãy chọn một truyện ở trên!`;
        showBadge(`Tìm thấy ${count} truyện`, "#27ae60");
      } else {
        elFolderNotice.textContent = `⚠️ Thư mục "${rootDirHandle.name}" chưa có file chương hoặc thư mục truyện nào.`;
      }
    } catch (err) {
      console.error("Lỗi quét thư mục:", err);
      elFolderNotice.textContent = "❌ Lỗi đọc thư mục: " + err.message;
    }
  }

  // Khi người dùng chọn 1 bộ truyện
  elBookFolderSelect.addEventListener("change", async () => {
    const selectedBookName = elBookFolderSelect.value;
    if (!selectedBookName || !bookSubDirectories.has(selectedBookName)) {
      elRangeWrap.style.display = "none";
      btnStartBatchTrans.style.display = "none";
      currentBookFiles = [];
      return;
    }

    const bookDirHandle = bookSubDirectories.get(selectedBookName);
    currentBookFiles = [];

    // Quét tất cả các file chương trong thư mục truyện này
    for await (const entry of bookDirHandle.values()) {
      if (entry.kind === "file") {
        const lower = entry.name.toLowerCase();
        if (lower.endsWith(".txt") || lower.endsWith(".docx") || lower.endsWith(".raw") || lower.endsWith(".json")) {
          // Trích xuất số thứ tự chương từ tên file (vd: #1_Chuong_1.txt, 1.txt, chapter_1...)
          const matchNum = entry.name.match(/\d+/);
          const chNum = matchNum ? parseInt(matchNum[0], 10) : 0;
          currentBookFiles.push({
            name: entry.name,
            fileHandle: entry,
            chapterNum: chNum
          });
        }
      }
    }

    if (!currentBookFiles.length) {
      alert("Không tìm thấy file chương (.txt, .docx, .json) nào trong thư mục này!");
      elRangeWrap.style.display = "none";
      btnStartBatchTrans.style.display = "none";
      return;
    }

    // Sắp xếp tự nhiên theo số thứ tự chương
    currentBookFiles.sort((a, b) => {
      if (a.chapterNum !== b.chapterNum) return a.chapterNum - b.chapterNum;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    const minCh = currentBookFiles[0].chapterNum || 1;
    const maxCh = currentBookFiles[currentBookFiles.length - 1].chapterNum || currentBookFiles.length;

    elFromCh.value = minCh;
    elFromTo.value = maxCh;
    elFromCh.max = maxCh;
    elFromTo.max = maxCh;

    chrome.storage.local.get(["cachedFolder"], (s) => {
      const base = s.cachedFolder || "Excerpo";
      elSavePathNotice.textContent = `📁 File dịch sẽ lưu tại: ${base}/translate/${selectedBookName}/`;
    });

    elFolderNotice.textContent = `Tìm thấy ${currentBookFiles.length} file chương (từ chương ${minCh} đến ${maxCh}).`;
    elRangeWrap.style.display = "flex";
    btnStartBatchTrans.style.display = "block";
  });

  // Trích xuất nội dung từ FileHandle (Hỗ trợ text và docx)
  async function extractTextFromFile(fileHandle) {
    const file = await fileHandle.getFile();
    const lower = file.name.toLowerCase();

    if (lower.endsWith(".docx")) {
      // Đọc file docx bằng JSZip
      try {
        const arrayBuf = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuf);
        const docXml = await zip.file("word/document.xml")?.async("string");
        if (docXml) {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(docXml, "application/xml");
          const paragraphs = Array.from(xmlDoc.getElementsByTagName("w:p"));
          return paragraphs.map(p => p.textContent.trim()).filter(Boolean).join("\n\n");
        }
      } catch (e) {
        console.warn("Lỗi đọc docx qua zip, fallback text:", e);
      }
    }

    // Mặc định đọc dạng UTF-8 text
    return await file.text();
  }

  // Dịch một văn bản thông qua BlackStone API
  async function callBlackStoneApi(title, content) {
    const apiKey = elApiKey.value.trim();
    const isNovel = elType.value === "novel";
    const isAdvance = elLevel.value === "advance";
    const bookId = elManualBookId.value.trim();

    let endpoint = "";
    let payload = {};

    if (isNovel) {
      if (isAdvance) {
        endpoint = `${BASE_URL}/translate/novel/advance`;
        payload = {
          book_id: bookId,
          chapter_number: elChapterNum.value.trim() || "1",
          title: title,
          content: content,
          model: "pro"
        };
      } else {
        endpoint = `${BASE_URL}/translate/novel/basic`;
        payload = {
          title: title,
          content: content,
          model: "lite"
        };
      }
    } else {
      // Manga mode
      const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
      const bubbles = lines.map((line, idx) => ({ id: `b${idx + 1}`, text: line }));
      if (isAdvance) {
        endpoint = `${BASE_URL}/translate/manga/advance`;
        payload = {
          book_id: bookId,
          genre: elGenre.value.trim() || "Hành động",
          context: elContext.value.trim() || "Phân cảnh đối thoại",
          fallback_mode: "original",
          bubbles: bubbles,
          model: "pro"
        };
      } else {
        endpoint = `${BASE_URL}/translate/manga/basic`;
        payload = {
          fallback_mode: "original",
          bubbles: bubbles,
          model: "lite"
        };
      }
    }

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      throw new Error(`HTTP_${resp.status}`);
    }

    const resData = await resp.json();
    const payloadData = resData.data || resData;
    if (payloadData.content_translated || payloadData.translated_content || payloadData.content) {
      const titleStr = payloadData.chapter_title_translated || payloadData.title_translated || title;
      const mainContentStr = payloadData.content_translated || payloadData.translated_content || payloadData.content || "";
      return `${titleStr}\n\n${mainContentStr}`;
    }
    if (Array.isArray(payloadData.bubbles)) {
      return payloadData.bubbles.map(b => (b.speaker ? `[${b.speaker}]: ` : "") + (b.text || b.translated_text || "")).join("\n");
    }
    return typeof resData === "string" ? resData : JSON.stringify(resData, null, 2);
  }

  // Lắng nghe cập nhật tiến độ dịch từ Background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'TRANSLATE_TASK_PROGRESS' && msg.data) {
      renderTranslateProgress(msg.data);
    }
  });

  function renderTranslateProgress(task) {
    if (!task) return;
    if (task.status === 'running') {
      elProgressWrap.style.display = "block";
      btnStartBatchTrans.style.display = "none";
      btnStopBatchTrans.style.display = "block";
      const total = Math.max(1, task.files.length);
      const pct = Math.round((task.doneCount / total) * 100);
      elProgressBar.style.width = `${pct}%`;
      elProgressPercent.textContent = `${pct}%`;
      elProgressText.textContent = `Đang dịch (${task.doneCount + 1}/${total}): ${task.currentFileName || ''}`;
    } else if (task.status === 'completed') {
      elProgressWrap.style.display = "block";
      btnStartBatchTrans.style.display = "block";
      btnStopBatchTrans.style.display = "none";
      elProgressBar.style.width = `100%`;
      elProgressPercent.textContent = `100%`;
      elProgressText.textContent = `✅ Đã dịch xong toàn bộ ${task.doneCount} file vào ${task.folderName}/translate/${task.bookName}/`;
      showBadge("Dịch hoàn tất!", "#27ae60");
    } else if (task.status === 'stopping' || task.status === 'stopped') {
      btnStartBatchTrans.style.display = "block";
      btnStopBatchTrans.style.display = "none";
      elProgressText.textContent = "⏹ Đã dừng tác vụ dịch.";
    } else if (task.status === 'error') {
      btnStartBatchTrans.style.display = "block";
      btnStopBatchTrans.style.display = "none";
      elProgressText.textContent = `❌ Lỗi: ${task.errorMsg || 'Không xác định'}`;
    }
  }

  // Khôi phục trạng thái tiến độ dịch khi mở popup
  chrome.runtime.sendMessage({ type: 'GET_TRANSLATE_STATUS' }, (task) => {
    if (task && task.status === 'running') {
      renderTranslateProgress(task);
    }
  });

  // ── Luồng Dịch Hàng Loạt (Gửi tác vụ chạy ngầm trong Background) ─────────────
  btnStartBatchTrans.addEventListener("click", async () => {
    const apiKey = elApiKey.value.trim();
    if (!apiKey) {
      alert("Vui lòng nhập BlackStone API Key!");
      elApiKey.focus();
      return;
    }

    const selectedBookName = elBookFolderSelect.value;
    if (!selectedBookName) return;

    const fromNum = parseInt(elFromCh.value, 10) || 1;
    const toNum = parseInt(elFromTo.value, 10) || 999999;

    // Lọc các file nằm trong phạm vi chương được chọn
    const targetFiles = currentBookFiles.filter(f => f.chapterNum >= fromNum && f.chapterNum <= toNum);
    if (!targetFiles.length) {
      alert(`Không tìm thấy file nào trong khoảng từ chương ${fromNum} đến ${toNum}!`);
      return;
    }

    // Đọc nội dung file raw trước khi chuyển giao hoàn toàn cho background
    btnStartBatchTrans.disabled = true;
    showBadge("Đang chuẩn bị file...", "#f39c12");
    elProgressWrap.style.display = "block";
    elProgressText.textContent = `Đang đọc ${targetFiles.length} file để đưa vào hàng đợi chạy ngầm...`;

    const preparedFiles = [];
    for (let i = 0; i < targetFiles.length; i++) {
      const item = targetFiles[i];
      try {
        const text = await extractTextFromFile(item.fileHandle);
        if (text && text.trim().length > 0) {
          preparedFiles.push({
            name: item.name,
            chapterNum: item.chapterNum,
            content: text
          });
        }
      } catch (e) {
        console.warn("Lỗi đọc file:", item.name, e);
      }
    }

    btnStartBatchTrans.disabled = false;
    if (!preparedFiles.length) {
      alert("Không đọc được nội dung của các file đã chọn!");
      elProgressWrap.style.display = "none";
      return;
    }

    // Lấy cấu hình thư mục và xử lý trùng file từ Cài đặt
    chrome.storage.local.get(["cachedFolder", "cachedConflictAction"], (s) => {
      const folderName = s.cachedFolder || "Excerpo";
      const conflictAction = s.cachedConflictAction || "overwrite";
      chrome.runtime.sendMessage({
        type: 'START_TRANSLATE_TASK',
        data: {
          apiKey,
          type: elType.value,
          level: elLevel.value,
          bookId: elManualBookId.value.trim(),
          bookName: selectedBookName,
          folderName,
          conflictAction,
          files: preparedFiles
        }
      }, () => {
        showBadge("Đã chạy dịch ngầm!", "#27ae60");
      });
    });
  });

  // Nút dừng dịch
  btnStopBatchTrans.addEventListener("click", () => {
    btnStopBatchTrans.textContent = "⏳ Đang dừng...";
    chrome.runtime.sendMessage({ type: 'STOP_TRANSLATE_TASK' });
  });

  if (btnDoTranslate) {
    btnDoTranslate.addEventListener("click", async () => {
      const apiKey = elApiKey.value.trim();
      if (!apiKey) return;
      const content = elContent ? elContent.value.trim() : "";
      if (!content) return;
      btnDoTranslate.disabled = true;
      try {
        const res = await callBlackStoneApi(elTitle ? elTitle.value.trim() : "", content);
        if (elResult) elResult.value = res;
      } catch (e) {
        handleApiErrorString(e.message);
      } finally {
        btnDoTranslate.disabled = false;
      }
    });
  }

  function handleApiErrorString(msg) {
    if (msg.includes("400")) {
      showBadge("400 Bad Request", "#e74c3c");
      elResult.value = "❌ 400 Bad Request: Dữ liệu gửi đi sai định dạng, vượt quá 5.000 từ hoặc thiếu book_id trong Advance mode.";
    } else if (msg.includes("401")) {
      showBadge("401 Unauthorized", "#e74c3c");
      elResult.value = "❌ 401 Unauthorized: API Key không hợp lệ hoặc đã bị thu hồi.";
    } else if (msg.includes("402")) {
      showBadge("402 Hết credit", "#e74c3c");
      elResult.value = "❌ 402 Payment Required: Số dư credit ví của bạn không đủ.";
    } else if (msg.includes("429")) {
      showBadge("429 Vượt giới hạn", "#e74c3c");
      elResult.value = "❌ 429 Rate Limit: Gửi quá 5 req/phút hoặc vượt daily spending cap.";
    } else {
      showBadge("Lỗi dịch thuật", "#e74c3c");
      elResult.value = "❌ Lỗi: " + msg;
    }
  }

  // Toggle API Key visibility
  btnToggleKey.addEventListener("click", () => {
    if (elApiKey.type === "password") {
      elApiKey.type = "text";
      btnToggleKey.textContent = "🔒";
    } else {
      elApiKey.type = "password";
      btnToggleKey.textContent = "👁️";
    }
  });

  // Save API Key
  const saveApiKeyToStorage = () => {
    const key = elApiKey.value.trim();
    chrome.storage.local.set({ blackstoneApiKey: key }, () => {
      showBadge("Đã lưu API Key", "#27ae60");
    });
  };

  btnSaveKey.addEventListener("click", saveApiKeyToStorage);
  elApiKey.addEventListener("change", saveApiKeyToStorage);
  elApiKey.addEventListener("paste", () => { setTimeout(saveApiKeyToStorage, 50); });

  // Mode change
  elType.addEventListener("change", () => {
    chrome.storage.local.set({ blackstoneType: elType.value });
    updateUIState();
  });

  elLevel.addEventListener("change", () => {
    chrome.storage.local.set({ blackstoneLevel: elLevel.value });
    updateUIState();
  });

  elBookSelect.addEventListener("change", () => {
    if (elBookSelect.value) {
      elManualBookId.value = elBookSelect.value;
      chrome.storage.local.set({ blackstoneBookId: elBookSelect.value });
    }
  });

  elManualBookId.addEventListener("input", () => {
    chrome.storage.local.set({ blackstoneBookId: elManualBookId.value.trim() });
  });

  function updateUIState() {
    const isAdvance = elLevel.value === "advance";
    const isNovel = elType.value === "novel";

    elAdvanceOptions.style.display = isAdvance ? "flex" : "none";
    elNovelAdvanceRow.style.display = (isAdvance && isNovel) ? "flex" : "none";
    elMangaAdvanceRow.style.display = (isAdvance && !isNovel) ? "flex" : "none";
  }

  function showBadge(text, bgColor = "#1a73e8") {
    elStatusBadge.textContent = text;
    elStatusBadge.style.background = bgColor;
    elStatusBadge.style.color = "#fff";
    elStatusBadge.style.display = "inline-block";
    setTimeout(() => { elStatusBadge.style.display = "none"; }, 4000);
  }

  function populateBookSelect(books, selectedId) {
    const lang = window.currentLang || "vi";
    const dict = (window.TRANSLATIONS && window.TRANSLATIONS[lang]) || {};
    elBookSelect.innerHTML = `<option value="">${dict.translateBookSelectPlaceholder || "-- Chọn cuốn sách đã tạo --"}</option>`;

    books.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b.id || b.book_id;
      opt.textContent = `${b.title || "Sách không tên"} (${b.id || b.book_id})`;
      if ((b.id || b.book_id) === selectedId) opt.selected = true;
      elBookSelect.appendChild(opt);
    });
  }

  btnRefreshBooks.addEventListener("click", async () => {
    const apiKey = elApiKey.value.trim();
    if (!apiKey) return;
    btnRefreshBooks.disabled = true;
    try {
      const resp = await fetch(`${BASE_URL}/books`, {
        method: "GET",
        headers: { "X-API-Key": apiKey }
      });
      if (resp.ok) {
        const books = await resp.json();
        const list = Array.isArray(books) ? books : (books.data || []);
        chrome.storage.local.set({ blackstoneBooks: list });
        populateBookSelect(list, elManualBookId.value.trim());
        showBadge(`Đã tải ${list.length} sách`, "#27ae60");
      }
    } catch (e) {
      showBadge("Lỗi tải sách", "#e74c3c");
    } finally {
      btnRefreshBooks.disabled = false;
    }
  });

  btnCreateBook.addEventListener("click", async () => {
    const apiKey = elApiKey.value.trim();
    if (!apiKey) return;
    const title = prompt("Nhập tên bộ truyện mới:");
    if (!title || !title.trim()) return;

    btnCreateBook.disabled = true;
    try {
      const resp = await fetch(`${BASE_URL}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ title: title.trim() })
      });
      if (resp.ok) {
        const data = await resp.json();
        const bookId = data.book_id || data.id;
        if (bookId) {
          elManualBookId.value = bookId;
          chrome.storage.local.set({ blackstoneBookId: bookId });
          btnRefreshBooks.click();
        }
      }
    } finally {
      btnCreateBook.disabled = false;
    }
  });

  btnClearTrans.addEventListener("click", () => {
    elTitle.value = "";
    elContent.value = "";
    elResult.value = "";
  });

  btnCopyResult.addEventListener("click", async () => {
    const text = elResult.value.trim();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    const oldText = btnCopyResult.textContent;
    btnCopyResult.textContent = "✅ Đã chép!";
    setTimeout(() => { btnCopyResult.textContent = oldText; }, 2000);
  });

})();
