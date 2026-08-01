const SourceSyosetuOrg = {
  name: "syosetu_org",
  maxWorkers: 1,
  downloadDelay: 1000,
  pattern: /syosetu\.org\/novel\/\d+/,

  // ── Preview config ─────────────────────────────────────────────────────────
  preview: {
    fields: {
      bookName:       "div#maind span[itemprop='name']",
      authorName:     "div#maind span[itemprop='author'] a",
      coverImage:     { selector: "img.cover", attr: "src" }, // Fallback if there's any cover image
      description:    {
        custom: (doc) => {
          const divs = doc.querySelectorAll("div#maind > div.ss");
          // The second div.ss usually contains the description
          if (divs.length >= 2) {
            const el = divs[1];
            // Remove hr tags inside
            const clone = el.cloneNode(true);
            clone.querySelectorAll("hr").forEach(hr => hr.remove());
            const text = clone.textContent.trim();
            return text.length > 250 ? text.slice(0, 250) + "..." : text;
          }
          return null;
        }
      },
      sourceBookCode: { urlPattern: /novel\/(\d+)/ }
    }
  },

  // ── Chapters config ────────────────────────────────────────────────────────
  chapters: {
    method: "tab",
    readySelector: "div#maind div.ss table tr td a | .episode-list__item a.episode-list__link",
    extract: async () => {
      // Small delay just to be safe
      await new Promise(r => setTimeout(r, 500));
      const elements = [...document.querySelectorAll("div#maind div.ss table tr td a, .episode-list__item a.episode-list__link")];
      return elements.map((el, idx) => {
        // Giao diện mới có <span class="episode-list__title"> để chứa tiêu đề
        const titleEl = el.querySelector('.episode-list__title');
        const title = titleEl ? titleEl.textContent : el.textContent;
        return {
          chapter_number: idx + 1,
          chapter_title:  title.replace(/\s+/g, ' ').trim(),
          chapter_url:    el.href, // in tab, el.href is absolute
          type:           "normal"
        };
      }).filter(c => c.chapter_url && !c.chapter_url.includes('javascript:'));
    },
    extractArgs: () => []
  },

  // ── Content config ─────────────────────────────────────────────────────────
  content: {
    readySelector: "div#honbun",
    type:          "paragraphs",
    selector:      "div#honbun",
    remove:        []
  },

  // ── Public API ─────────────────────────────────────────────────────────────
  parsePreview(html, url)        { return parsePreview(html, url, this.preview);         },
  fetchChapters(url, progressCb) { return parseChapters(url, this.chapters, progressCb); }
};
