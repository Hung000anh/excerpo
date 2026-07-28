// czbooks source
const SourceCzbooks = {
  name: "czbooks",
  pattern: /(?:www\.)?czbooks\.net\/n\/[a-zA-Z0-9]+/,

  // ── Preview config ────────────────────────────────────────────────────────
  preview: {
    fields: {
      bookName: { custom: (doc) => {
        let title = doc.querySelector('.info-wrap .info .title')?.textContent?.trim() || "";
        return title.replace(/^《|》$/g, "");
      }},
      authorName: {
        custom: (doc) => doc.querySelector('.info-wrap .info .author a')?.textContent?.trim() || null
      },
      coverImage: {
        custom: (doc, url) => {
          const img = doc.querySelector(".thumbnail img");
          if (!img) return null;
          let src = img.getAttribute("src") || "";
          if (src.startsWith("//")) src = "https:" + src;
          return src || null;
        }
      },
      description: {
        custom: (doc) => {
          const el = doc.querySelector(".info-wrap .description");
          if (!el) return null;
          const text = el.textContent?.trim() || "";
          return text.length > 200 ? text.slice(0, 200) + "…" : text;
        }
      },
      sourceBookCode: {
        custom: (doc, url) => {
          const match = url.match(/\/n\/([a-zA-Z0-9]+)/);
          return match ? match[1] : "";
        }
      }
    }
  },

  // ── Chapters config ────────────────────────────────────────────────────────
  chapters: {
    method: "tab",
    readySelector: "#chapter-list",
    extract: (url) => {
      const links = Array.from(document.querySelectorAll("#chapter-list li:not(.volume) a"));
      return links.map((a, index) => {
        return {
          chapter_number: index + 1,
          chapter_title: a.textContent.replace(/[\n\t\r]+/g, " ").replace(/\s+/g, " ").trim(),
          chapter_url: a.href,
          type: "normal"
        };
      });
    }
  },

  // ── Content config ────────────────────────────────────────────────────────
  content: {
    readySelector: ".content",
    type: "text",
    selector: ".content",
    remove: ["script", "style", ".code-block"]
  },

  // ── Public API ─────────────────────────────────────────────────────────────
  parsePreview(html, url) {
    return parsePreview(html, url, this.preview);
  },
  async fetchChapters(url, progressCb) {
    return parseChapters(url, this.chapters, progressCb);
  }
};
