// novelight source
const SourceNovelight = {
  name: "novelight",
  pattern: /(?:www\.)?novelight\.(?:net|com|org)\/(?:novel|manga|book)\/[a-zA-Z0-9-\/]+/,

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
          const img = doc.querySelector(".poster img") || doc.querySelector(".summary_image img") || doc.querySelector("meta[property='og:image']");
          if (!img) return null;
          let src = img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("content") || "";
          if (!src) return null;
          try {
            return new URL(src, url).href;
          } catch (e) {
            if (src.startsWith("//")) return "https:" + src;
            if (src.startsWith("/")) return new URL(url).origin + src;
            return src;
          }
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
          const match = url.match(/(?:novel|manga|book)\/([a-zA-Z0-9-]+)/);
          return match ? match[1] : "";
        }
      }
    }
  },

  // ── Chapters config ────────────────────────────────────────────────────────
  chapters: {
    method: "tab",
    readySelector: "#all-chapters-list, .wp-manga-chapter a, ul.main li a",
    extract: async (url) => {
      const parseChaptersFromHTML = (htmlStr) => {
        const div = document.createElement('div');
        div.innerHTML = htmlStr;
        const links = Array.from(div.querySelectorAll("a.chapter"));
        return links.map(a => {
          const titleEl = a.querySelector('.title');
          const title = titleEl ? titleEl.textContent : a.textContent;
          let href = a.getAttribute("href") || a.href || "";
          if (href && href.startsWith("/")) {
            try { href = new URL(href, url).href; } catch(e) {}
          }
          return {
            chapter_title: title.replace(/[\n\t\r]+/g, " ").replace(/\s+/g, " ").trim(),
            chapter_url: href,
            type: "normal"
          };
        });
      };

      let allChapters = [];
      const select = document.getElementById("select-pagination-chapter");
      
      if (select) {
        try {
          const htmlText = document.documentElement.innerHTML;
          const bookIdMatch = htmlText.match(/OBJECT_BY_COMMENT\s*=\s*(\d+)/);
          const bookId = bookIdMatch ? bookIdMatch[1] : "";
          
          const csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
          const csrfToken = csrfInput ? csrfInput.value : (htmlText.match(/name=["']csrfmiddlewaretoken["']\s+value=["']([^"']+)["']/) || [])[1] || "";
          
          if (csrfToken && bookId) {
            const options = Array.from(select.querySelectorAll("option"));
            for (let i = options.length - 1; i >= 0; i--) {
              const page = options[i].value;
              const res = await fetch(`/book/ajax/chapter-pagination?csrfmiddlewaretoken=${csrfToken}&book_id=${bookId}&page=${page}`, {
                headers: {
                  "X-Requested-With": "XMLHttpRequest",
                  "Accept": "application/json, text/javascript, */*; q=0.01"
                }
              });
              const text = await res.text();
              let json;
              try { json = JSON.parse(text); } catch(e) {}
              if (json && json.html) {
                let chaps = parseChaptersFromHTML(json.html);
                chaps.reverse();
                allChapters = allChapters.concat(chaps);
              }
            }
          }
        } catch (e) {
          console.error("Pagination fetch error:", e);
        }
      }

      // Fallback nếu việc lấy phân trang thất bại hoặc không có phân trang
      if (allChapters.length === 0) {
        const links = Array.from(document.querySelectorAll("#all-chapters-list a.chapter, .wp-manga-chapter a, ul.main li a"));
        links.reverse();
        allChapters = links.map(a => {
          const titleEl = a.querySelector('.title');
          const title = titleEl ? titleEl.textContent : a.textContent;
          let href = a.getAttribute("href") || a.href || "";
          if (href && href.startsWith("/")) {
            try { href = new URL(href, url).href; } catch(e) {}
          }
          return {
            chapter_title: title.replace(/[\n\t\r]+/g, " ").replace(/\s+/g, " ").trim(),
            chapter_url: href,
            type: "normal"
          };
        });
      }

      return allChapters.map((ch, index) => {
        ch.chapter_number = index + 1;
        return ch;
      });
    }
  },

  // ── Content config ────────────────────────────────────────────────────────
  content: {
    method: "tab",
    readySelector: "div.chapter-text, div.text-left, .reading-content",
    type: "spans",
    selector: "div.chapter-text > div:not(.advertisment), div.chapter-text > p, div.text-left > p, .reading-content > p",
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
