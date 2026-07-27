// novelight source
const SourceNovelight = {
  name: "novelight",
  pattern: /(?:www\.)?novelight\.(?:net|com|org)\/(?:novel|manga)\/[a-zA-Z0-9-]+/,

  // ── Preview config ────────────────────────────────────────────────────────
  preview: {
    fields: {
      bookName: { custom: (doc) => doc.querySelector('.post-title h1, .entry-title, h1')?.textContent?.trim() || doc.querySelector('meta[property="og:title"]')?.getAttribute("content") || "" },
      authorName: {
        custom: (doc) => {
          const authorEl = doc.querySelector('.author-content a, .entry-author a');
          return authorEl ? authorEl.textContent?.trim() : null;
        }
      },
      coverImage: {
        custom: (doc, url) => {
          const img = doc.querySelector(".summary_image img, meta[property='og:image']");
          if (!img) return null;
          let src = img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("content") || "";
          if (src.startsWith("//")) src = "https:" + src;
          return src || null;
        }
      },
      description: {
        custom: (doc) => {
          const el = doc.querySelector(".summary__content, .entry-content");
          if (!el) return null;
          const text = el.textContent?.trim() || "";
          return text.length > 200 ? text.slice(0, 200) + "…" : text;
        }
      },
      sourceBookCode: {
        custom: (doc, url) => {
          const match = url.match(/(?:novel|manga)\/([a-zA-Z0-9-]+)/);
          return match ? match[1] : "";
        }
      }
    }
  },

  // ── Chapters config ────────────────────────────────────────────────────────
  chapters: {
    method: "tab",
    readySelector: ".wp-manga-chapter a, ul.main li a",
    extract: (url) => {
      const links = Array.from(document.querySelectorAll(".wp-manga-chapter a, ul.main li a"));
      links.reverse();
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
    readySelector: "div.text-left p, .reading-content p",
    type: "paragraphs",
    selector: "div.text-left, .reading-content",
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
(self.EXCERPO_SOURCES = self.EXCERPO_SOURCES || []).push(SourceNovelight);
