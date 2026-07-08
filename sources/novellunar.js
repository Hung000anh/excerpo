// novellunar source
const SourceNovelLunar = {
  name: "novellunar",
  pattern: /(?:www\.)?novellunar\.com\/novel\/[a-zA-Z0-9-]+/,

  // ── Preview config ────────────────────────────────────────────────────────
  preview: {
    fields: {
      bookName: "div.flex-1 h1",
      authorName: { custom: (doc) => {
        const a = doc.querySelector('a[href^="/author/"]');
        return a ? a.textContent.trim() : null;
      }},
      coverImage: { selector: "div.aspect-\\[3\\/4\\] img, img[src*='img.novellunar.com']", attr: "src" },
      sourceBookCode: { urlPattern: /novel\/([a-zA-Z0-9-]+)/ }
    }
  },

  // ── Chapters config ────────────────────────────────────────────────────────
  chapters: {
    method: "tab",
    readySelector: "h1",
    extract: async (url) => {
      const match = window.location.href.match(/novel\/([a-zA-Z0-9-]+)/);
      if (!match) throw new Error("Không tìm thấy ID truyện trong URL");
      const novelSlug = match[1];

      let page = 1;
      const limit = 100;
      const chapters = [];
      let hasMore = true;

      while (hasMore) {
        const apiUrl = `/api/novels/chapters?novelSlug=${novelSlug}&page=${page}&limit=${limit}&sort=asc`;
        const resp = await fetch(apiUrl);
        if (!resp.ok) throw new Error(`API Error ${resp.status}`);
        const resJson = await resp.json();
        const items = resJson.data || [];
        if (items.length === 0) {
          hasMore = false;
          break;
        }
        for (const item of items) {
          chapters.push({
            chapter_number: item.chapterNumber,
            chapter_title: item.title,
            chapter_url: `https://novellunar.com/novel/${novelSlug}/chapter/${item.chapterNumber}`,
            type: "normal"
          });
        }
        if (items.length < limit) {
          hasMore = false;
        } else {
          page++;
        }
      }
      return chapters;
    },
    extractArgs: (url) => [url]
  },

  // ── Content config ────────────────────────────────────────────────────────
  content: {
    readySelector: "article div.text-gray-800",
    type: "text",
    selector: "article div.text-gray-800"
  },

  // ── Public API ─────────────────────────────────────────────────────────────
  parsePreview(html, url) {
    return parsePreview(html, url, this.preview);
  },
  async fetchChapters(url, progressCb) {
    return parseChapters(url, this.chapters, progressCb);
  }
};
