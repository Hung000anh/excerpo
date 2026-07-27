// cardboardtranslation source
const SourceCardboardtranslation = {
  name: "cardboardtranslation",
  pattern: /(?:www\.)?cardboardtranslations?\.com\/.+/,

  // ── Preview config ────────────────────────────────────────────────────────
  preview: {
    fields: {
      bookName: { custom: (doc) => doc.querySelector('h1.post-title, .seriesTitle h1, h1.entry-title, h1')?.textContent?.trim() || doc.querySelector('meta[property="og:title"]')?.getAttribute("content") || "" },
      authorName: {
        custom: (doc) => {
          const authorEl = doc.querySelector('.infonya.author, .author-name, .entry-author, .author a');
          if (!authorEl) return null;
          return authorEl.textContent.replace(/^Author:\s*/i, "").trim();
        }
      },
      coverImage: {
        custom: (doc, url) => {
          const img = doc.querySelector(".thumb img, img.post-thumbnail, .summary_image img, .series-thumb img, .post-body img, meta[property='og:image']");
          if (!img) return null;
          let src = img.getAttribute("src") || img.getAttribute("content") || "";
          if (src.startsWith("//")) src = "https:" + src;
          return src || null;
        }
      },
      description: {
        custom: (doc) => {
          const el = doc.querySelector(".descManga, .entry-content, .series-synopsis, .summary__content, .post-body");
          if (!el) return null;
          const text = el.textContent?.trim() || "";
          return text.length > 200 ? text.slice(0, 200) + "…" : text;
        }
      },
      sourceBookCode: {
        custom: (doc, url) => {
          const match = url.match(/cardboardtranslations?\.com\/(?:(?:\d{4}\/\d{2}\/)|(?:novel|series)\/)?([^?#]+)/);
          return match ? match[1].replace(/\.html$/, "") : "";
        }
      }
    }
  },

  // ── Chapters config ────────────────────────────────────────────────────────
  chapters: {
    method: "tab",
    readySelector: "ul.myUL a, .wp-manga-chapter a, .chapter-list a, .entry-content a[href*='chapter'], .post-body a[href*='.html']",
    extract: (url) => {
      let links = Array.from(document.querySelectorAll("ul.myUL a, .wp-manga-chapter a, .chapter-list a, .entry-content a[href*='chapter'], .post-body a[href*='.html']"));
      
      // Check if chapters are descending (e.g. Chapter 85 first, Chapter 1 last)
      if (links.length > 1) {
        const firstText = links[0].textContent;
        const lastText = links[links.length - 1].textContent;
        const firstNumMatch = firstText.match(/(?:ch|chapter|c)\.?\s*(\d+)/i);
        const lastNumMatch = lastText.match(/(?:ch|chapter|c)\.?\s*(\d+)/i);
        
        if (firstNumMatch && lastNumMatch) {
          if (parseInt(firstNumMatch[1]) > parseInt(lastNumMatch[1])) {
            links.reverse();
          }
        } else if (firstText.toLowerCase().includes('extra') && !lastText.toLowerCase().includes('extra')) {
           links.reverse();
        }
      }

      return links.map((a, index) => {
        let clone = a.cloneNode(true);
        let dateEl = clone.querySelector('.chapterdate');
        if (dateEl) dateEl.remove();
        
        return {
          chapter_number: index + 1,
          chapter_title: clone.textContent.replace(/[\n\t\r]+/g, " ").replace(/\s+/g, " ").trim(),
          chapter_url: a.href,
          type: "normal"
        };
      });
    }
  },

  // ── Content config ────────────────────────────────────────────────────────
  content: {
    readySelector: ".post-body.entry-content p, .entry-content p, .post-body p",
    type: "paragraphs",
    selector: ".post-body.entry-content, .entry-content, .post-body",
    remove: ["script", "style", ".code-block", ".sharedaddy", ".social-share", "#chapterSelect", "#ecPrev", "#ecNext"]
  },

  // ── Public API ─────────────────────────────────────────────────────────────
  parsePreview(html, url) {
    return parsePreview(html, url, this.preview);
  },
  async fetchChapters(url, progressCb) {
    return parseChapters(url, this.chapters, progressCb);
  }
};
