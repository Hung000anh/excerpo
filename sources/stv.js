const SourceSTV = {
  name: "stv",
  maxWorkers: 1,
  pattern: /(?:[a-z0-9-]+\.)?sangtacviet\.[a-z]{2,6}\/truyen\/.*/i,

  // ── Preview config ─────────────────────────────────────────────────────────
  preview: {
    fields: {
      bookName:       { selector: "meta[property='og:novel:book_name']", attr: "content" },
      authorName:     { selector: "meta[property='og:novel:author']", attr: "content" },
      coverImage:     { selector: "meta[property='og:image']", attr: "content" },
      description:    { selector: "meta[itemprop='description']", attr: "content" },
      sourceBookCode: { urlPattern: /\/truyen\/[^\/]+\/\d+\/(\d+)/ }
    }
  },

  // ── Chapters config ────────────────────────────────────────────────────────
  chapters: {
    method: "tab",
    listUrl: (url) => url,
    readySelector: "div#chaptercontainerinner a.listchapitem, div#chaptercontainer a",
    extract: (selector) => {
      const elements = [...document.querySelectorAll(selector)];
      const origin = location.origin;

      return elements.map((el, i) => {
        const parent = el.parentElement;
        const urlKey = Object.keys(parent || {}).find(k => !k.startsWith("__") && !k.startsWith("jQuery"));
        const path = urlKey ? parent[urlKey] : null;
        const chapId = el.getAttribute("id") || "";
        let chapterUrl = null;

        if (path) {
          chapterUrl = path.startsWith("http") ? path : (origin + path);
        } else if (chapId && location.href) {
          const m = location.href.match(/(\/truyen\/[^\/]+\/\d+\/\d+)/);
          if (m) {
            chapterUrl = `${origin}${m[1]}/${chapId}/`;
          }
        }

        const isVip = el.classList.contains("vip");
        const textContent = el.textContent.replace(/\s+/g, " ").trim();
        const titleAttr = (el.getAttribute("title") || "").trim();
        const title = textContent || titleAttr || ("Chương " + (i + 1));

        return {
          chapter_number: i + 1,
          chapter_title: title,
          chapter_url: chapterUrl,
          //   type: isVip ? "vip" : "normal",
          type: "normal"
        };
      }).filter(c => c.chapter_url);
    },
    extractArgs: () => ["div#chaptercontainerinner a.listchapitem, div#chaptercontainer a"]
  },

  // ── Content config ─────────────────────────────────────────────────────────
  content: {
    readySelector: "body",
    type: "stv",
    selector: "body",
    remove: ["script", "style"]
  },

  // ── Public API ─────────────────────────────────────────────────────────────
  parsePreview(html, url) {
    return parsePreview(html, url, this.preview);
  },
  async fetchChapters(url, progressCb) {
    return parseChapters(url, this.chapters, progressCb);
  }
};

const SourceSangtacviet = SourceSTV;
