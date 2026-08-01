const SourceSyosetu = {
  name: "syosetu",
  pattern: /(?:ncode|novel18)\.syosetu\.com\/([^\/]+)/,

  // ── Preview config ─────────────────────────────────────────────────────────
  preview: {
    fields: {
      bookName: {
        custom: (doc) => {
          return doc.querySelector('h1.p-novel__title')?.textContent.trim() 
            || doc.querySelector('.p-novel__title')?.textContent.trim() 
            || doc.querySelector('title')?.textContent.trim() 
            || "";
        }
      },
      authorName: {
        custom: (doc) => {
          const authorEl = doc.querySelector('.p-novel__author');
          if (!authorEl) return "";
          return authorEl.textContent.replace(/^作者：/, "").trim();
        }
      },
      coverImage: {
        custom: () => null
      },
      description: {
        custom: (doc) => {
          return doc.querySelector('#novel_ex')?.textContent.trim()
            || doc.querySelector('.p-novel__summary')?.textContent.trim()
            || "";
        }
      },
      sourceBookCode: { urlPattern: /syosetu\.com\/([^\/]+)/ }
    }
  },

  // ── Chapters config ────────────────────────────────────────────────────────
  chapters: {
    method: "custom",
    custom: async (url, progressCallback) => {
      let currentUrl = url;
      const chapters = [];
      const visited = new Set();
      let page = 1;

      while (currentUrl && !visited.has(currentUrl)) {
        visited.add(currentUrl);
        progressCallback(`Đang lấy danh sách chương: trang ${page}`);

        const resp = await fetch(currentUrl, {
          headers: {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
          }
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const html = await resp.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        const elements = [...doc.querySelectorAll(".p-eplist__sublist a.p-eplist__subtitle, .p-eplist__subtitle")];
        for (const el of elements) {
          const href = el.getAttribute('href') || '';
          if (!href) continue;
          const host = new URL(currentUrl).origin;
          const fullUrl = href.startsWith('/') ? `${host}${href}` : href;

          chapters.push({
            chapter_number: chapters.length + 1,
            chapter_title: el.textContent.replace(/\s+/g, ' ').trim(),
            chapter_url: fullUrl,
            type: "normal"
          });
        }

        const nextEl = doc.querySelector("a.c-pager__item--next[href]");
        if (nextEl) {
          const href = nextEl.getAttribute('href');
          currentUrl = new URL(href, currentUrl).href;
          page++;
          await new Promise(r => setTimeout(r, 200));
        } else {
          currentUrl = null;
        }
      }

      return chapters;
    }
  },

  // ── Content config ─────────────────────────────────────────────────────────
  content: {
    readySelector: ".p-novel__body",
    type:          "paragraphs",
    selector:      ".p-novel__body"
  },

  // ── Public API ─────────────────────────────────────────────────────────────
  parsePreview(html, url)        { return parsePreview(html, url, this.preview); },
  fetchChapters(url, progressCb) { return parseChapters(url, this.chapters, progressCb); }
};
