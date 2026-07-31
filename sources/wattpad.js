const SourceWattpad = {
  name: "wattpad",
  pattern: /wattpad\.com\/story\/\d+/,

  // ── Preview config ─────────────────────────────────────────────────────────
  preview: {
    fields: {
      bookName: {
        custom: (doc) => {
          return doc.querySelector(".story-info .title")?.textContent?.trim()
            || doc.querySelector("h1")?.textContent?.trim()
            || doc.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim()
            || "";
        }
      },
      authorName: {
        custom: (doc) => {
          const authorEl = doc.querySelector(".author-info .author-name a")
                        || doc.querySelector(".author-info a")
                        || doc.querySelector('a[href*="/user/"]');
          return authorEl ? authorEl.textContent.replace(/^by\s+/i, "").trim() : "";
        }
      },
      coverImage: {
        custom: (doc) => {
          return doc.querySelector('img[src*="img.wattpad.com/cover/"]')?.getAttribute("src")
            || doc.querySelector('img[class^="cover__"]')?.getAttribute("src")
            || doc.querySelector(".story-cover img")?.getAttribute("src")
            || doc.querySelector('meta[property="og:image"]')?.getAttribute("content")
            || null;
        }
      },
      description: {
        custom: (doc) => {
          return doc.querySelector(".description")?.textContent?.trim()
            || doc.querySelector('meta[property="og:description"]')?.getAttribute("content")
            || "";
        }
      },
      sourceBookCode: { urlPattern: /story\/(\d+)/ }
    }
  },

  // ── Chapters config ────────────────────────────────────────────────────────
  chapters: {
    method: "custom",
    custom: async (url, progressCb) => {
      const match = url.match(/story\/(\d+)/);
      if (!match) throw new Error("Không tìm thấy Story ID từ URL Wattpad.");
      const storyId = match[1];

      progressCb("Đang lấy danh sách chương từ Wattpad API...");
      const apiUrl = `https://www.wattpad.com/api/v3/stories/${storyId}`;
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`Lỗi tải API Wattpad: HTTP ${res.status}`);
      const data = await res.json();

      const parts = data.parts || [];
      return parts.map((part, i) => {
        let partUrl = part.url || "";
        if (partUrl && !partUrl.startsWith("http")) {
          partUrl = `https://www.wattpad.com${partUrl.startsWith("/") ? "" : "/"}${partUrl}`;
        }
        return {
          chapter_number: i + 1,
          chapter_title: part.title ? part.title.trim() : `Chương ${i + 1}`,
          chapter_url: partUrl,
          type: "normal"
        };
      }).filter(c => c.chapter_url);
    }
  },

  // ── Content config ─────────────────────────────────────────────────────────
  content: {
    readySelector: "main, body",
    type:          "wattpad",
    selector:      "body"
  },

  // ── Public API ─────────────────────────────────────────────────────────────
  parsePreview(html, url)        { return parsePreview(html, url, this.preview); },
  fetchChapters(url, progressCb) { return parseChapters(url, this.chapters, progressCb); }
};
