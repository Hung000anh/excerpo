const SourceXbiquge = {
  name: "xbiquge",
  maxWorkers: 1,
  downloadDelay: 2000,
  pattern: /xbiquge\.[a-z]+\/\d+\/\d+/,

  // ── Preview config ─────────────────────────────────────────────────────────
  preview: {
    fields: {
      bookName: "div.row.book_info h1 | div.info h1",
      authorName: {
        custom: (doc) => {
          for (const li of doc.querySelectorAll(".row.book_info .info ul li, div.info ul li")) {
            const a = li.querySelector('a[href*="search.php"]');
            if (a) return a.textContent.trim();
          }
          return null;
        }
      },
      coverImage: { selector: "div.row.book_info img.img-thumbnail | img.img-thumbnail", attr: "src" },
      description: {
        custom: (doc) => {
          const el = doc.querySelector("#intro_pc, #intro_m .in, div.intro");
          if (!el) return null;
          let text = el.textContent.replace(/\s+/g, " ").trim();
          text = text.replace(/^(Tóm tắt|简介)\s*[:：]?\s*/i, "");
          return text.length > 250 ? text.slice(0, 250) + "..." : text;
        }
      },
      sourceBookCode: { urlPattern: /\/\d+\/(\d+)/ }
    }
  },

  // ── Chapters config — custom vì list chapter phân trang index_N.html ───────
  chapters: {
    method: "custom",
    custom: async (url, progressCallback) => {
      const baseUrl = url
        .replace(/index_\d+\.html(?:\?.*)?$/, "")
        .replace(/\?.*$/, "")
        .replace(/\/$/, "");

      const fetchHeaders = {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "zh-CN,zh;q=0.9",
        Referer: "https://www.xbiquge.info/",
      };

      async function fetchDoc(pageUrl) {
        const resp = await fetch(pageUrl, { headers: fetchHeaders });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return new DOMParser().parseFromString(await resp.text(), "text/html");
      }

      function findChapterListBox(doc) {
        for (const box of doc.querySelectorAll("div.box.mt10")) {
          const title = box.querySelector("h2.title");
          if (title && /章节列表/.test(title.textContent)) return box;
        }
        return null;
      }

      function parseTotalPages(doc) {
        const box = findChapterListBox(doc);
        const scope = box || doc;
        const disabled = scope.querySelector(
          ".pages .pagination li.disabled a.page-link, .pages .pagination li.page-item.disabled a"
        );
        if (disabled) {
          const m = disabled.textContent.trim().match(/(\d+)\s*\/\s*(\d+)/);
          if (m) return parseInt(m[2], 10);
        }
        let max = 1;
        for (const a of scope.querySelectorAll('.pages .pagination a.page-link[href*="index_"]')) {
          const hm = a.getAttribute("href")?.match(/index_(\d+)\.html/);
          if (hm) max = Math.max(max, parseInt(hm[1], 10));
        }
        return max;
      }

      function pageUrl(pageNum) {
        if (pageNum <= 1) return baseUrl + "/";
        return `${baseUrl}/index_${pageNum}.html`;
      }

      function extractFromDoc(doc, startNumber) {
        const box = findChapterListBox(doc);
        if (!box) return [];

        const links = box.querySelectorAll(".book_list.book_list2 ul.row li a, .book_list ul li a");
        const chapters = [];
        let num = startNumber;
        for (const a of links) {
          const href = a.getAttribute("href");
          if (!href || href.includes("javascript:") || href.includes("index_")) continue;
          if (!/\/\d+\.html(?:\?.*)?$/.test(href.split("?")[0])) continue;
          const title = a.textContent.replace(/\s+/g, " ").trim();
          if (!title) continue;
          chapters.push({
            chapter_number: num++,
            chapter_title: title,
            chapter_url: new URL(href, baseUrl + "/").href,
            type: "normal"
          });
        }
        return chapters;
      }

      progressCallback(`Đang lấy danh sách chương: ${pageUrl(1)}`);
      const firstDoc = await fetchDoc(pageUrl(1));
      const totalPages = parseTotalPages(firstDoc);

      const allChapters = extractFromDoc(firstDoc, 1);

      for (let page = 2; page <= totalPages; page++) {
        const currentUrl = pageUrl(page);
        progressCallback(`Đang lấy danh sách chương: ${currentUrl} (${page}/${totalPages})`);
        await new Promise(r => setTimeout(r, 300));
        const doc = await fetchDoc(currentUrl);
        allChapters.push(...extractFromDoc(doc, allChapters.length + 1));
      }

      return allChapters;
    }
  },

  // ── Content config ─────────────────────────────────────────────────────────
  content: {
    readySelector: "article.font_max[data-merged='true']",
    type: "text",
    selector: "article.font_max[data-merged='true']",
    remove: ["script", "style"],
    lineFilter: "^第\\s*[（(]\\s*\\d+\\s*\\/\\s*\\d+\\s*[）)]\\s*页\\s*$"
  },

  // ── Public API ─────────────────────────────────────────────────────────────
  parsePreview(html, url) { return parsePreview(html, url, this.preview); },
  fetchChapters(url, progressCb) { return parseChapters(url, this.chapters, progressCb); }
};