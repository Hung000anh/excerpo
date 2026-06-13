const Source69shuba = {
  name: "69shuba",
  maxWorkers: 1,
  downloadDelay: 2000,
  pattern: /69shu(ba)?\.[a-z]+\/book/,

  // ── Preview config ─────────────────────────────────────────────────────────
  preview: {
    fields: {
      bookName:       ".booknav2 h1 a",
      authorName:     {
        custom: (doc) => {
          const a = doc.querySelector('.booknav2 a[href*="author"]');
          return a ? a.textContent.trim() : null;
        }
      },
      coverImage:     { selector: ".bookimg2 img", attr: "src" },
      description:    {
        custom: (doc) => {
          const el = doc.querySelector(".navtxt") || doc.querySelector(".nav_txt") || doc.querySelector("meta[name='description']");
          if (!el) return null;
          if (el.tagName === 'META') return el.getAttribute('content')?.slice(0, 200) || null;
          return el.textContent.trim().slice(0, 200) || null;
        }
      },
      sourceBookCode: { urlPattern: /book\/(\d+)/ }
    }
  },

  // ── Chapters config ────────────────────────────────────────────────────────
  chapters: {
    method: "tab",
    listUrl: (url) => {
      if (url.endsWith('.htm')) return url.replace(/\.htm$/, '/');
      return url.endsWith('/') ? url : url + '/';
    },
    readySelector: "#catalog ul li a",
    extract: (selector) => {
      const elements = [...document.querySelectorAll(selector)];
      return elements.map((el, i) => {
        return {
          chapter_number: i + 1,
          chapter_title:  el.textContent.replace(/\s+/g, ' ').trim(),
          chapter_url:    el.href,
          type:           "normal"
        };
      }).filter(c => c.chapter_url && !c.chapter_url.includes('javascript:'));
    },
    extractArgs: () => ["#catalog ul li a"]
  },

  // ── Content config ─────────────────────────────────────────────────────────
  content: {
    readySelector: ".txtnav",
    type:          "text",
    selector:      ".txtnav",
    remove:        [".hide720", ".txtinfo", "h1", "#txtright", ".contentadv", ".bottom-ad"]
  },

  // ── Public API ─────────────────────────────────────────────────────────────
  parsePreview(html, url)        { return parsePreview(html, url, this.preview);         },
  fetchChapters(url, progressCb) { return parseChapters(url, this.chapters, progressCb); }
};
