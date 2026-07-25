const SourceSTV = {
  name: "stv",
  maxWorkers: 1,
  pattern: /sangtacviet\.(?:app|com)\/truyen\/.*\/.*\/.*/,

  // ── Preview config ─────────────────────────────────────────────────────────
  preview: {
    fields: {
      bookName:       { selector: "meta[property='og:novel:book_name']", attr: "content" },
      authorName:     { selector: "meta[property='og:novel:author']", attr: "content" },
      coverImage:     { selector: "meta[property='og:image']", attr: "content" },
      description:    { selector: "meta[itemprop='description']", attr: "content" },
      sourceBookCode: { urlPattern: /\/truyen\/.*\/.*\/.*/ }
    }
  },

  // ── Chapters config ────────────────────────────────────────────────────────
  chapters: {
    method: "tab",
    listUrl: (url) => url,
    readySelector: "div#chaptercontainer a",
    extract: (selector) => {
      return [...document.querySelectorAll(selector)].map((el, i) => {
        const parent = el.parentElement;
        const urlKey = Object.keys(parent).find(k => !k.startsWith("__") && !k.startsWith("jQuery"));
        const path = urlKey ? parent[urlKey] : null;
        return {
            chapter_number: i + 1,
            chapter_title: (el.getAttribute("title") || "").trim() || ("Chuong " + (i + 1)),
            chapter_url: path ? ("https://sangtacviet.com" + path) : null,
        };
      }).filter(c => c.chapter_url);
    },
    extractArgs: () => ["div#chaptercontainer a"]
  },

  // ── Content config ─────────────────────────────────────────────────────────
  content: {
    // readySelector is not needed
    type:          "fetch",
    swapText:      { selector: "i[t]", attr: "t" }, // swap text
    selector: "", // empty means obtaining all text in data
    urlPattern:    "\\/truyen\\/([^\\/]+)\\/[^\\/]+\\/(\\d+)\\/(\\d+)\\/",
    urlTemplate:   "https://sangtacviet.com/index.php?bookid={2}&h={1}&c={3}&ngmar=readc&sajax=readchapter&sty=1&exts=",
  },

  // ── Public API ─────────────────────────────────────────────────────────────
  parsePreview(html, url)        { return parsePreview(html, url, this.preview);         },
  fetchChapters(url, progressCb) { return parseChapters(url, this.chapters, progressCb); },
};
